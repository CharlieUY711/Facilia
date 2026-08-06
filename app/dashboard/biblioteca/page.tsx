"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ViewTabBar from "@/components/dashboard/ViewTabBar";
import type { DocumentFilters, LibraryDocument, LibraryFolder, RepositoryType } from "@/lib/library/types";
import {
  deleteDocument,
  deleteFolder as deleteFolderApi,
  fetchDocuments,
  fetchDownloadUrl,
  fetchFolder,
  fetchFolders,
} from "@/lib/library/client";
import Breadcrumb from "@/components/library/Breadcrumb";
import FolderTree from "@/components/library/FolderTree";
import DocumentTable from "@/components/library/DocumentTable";
import UploadDropzone from "@/components/library/UploadDropzone";
import PreviewModal from "@/components/library/PreviewModal";
import NewFolderModal from "@/components/library/NewFolderModal";
import FiltersPanel, { type OrgOption } from "@/components/library/FiltersPanel";
import { RenameModal, MoveModal, LinkModal, ConfirmDeleteModal } from "@/components/library/ActionModals";
import { IconFilter, IconPlus, IconSearch, IconUpload } from "@/components/library/icons";

type Role = "super_admin" | "admin" | "colaborador";

export default function BibliotecaPage() {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const isAdmin = role === "super_admin" || role === "admin";

  const [repositoryType, setRepositoryType] = useState<RepositoryType>("publica");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [ancestors, setAncestors] = useState<LibraryFolder[]>([]);
  const [treeRefreshKey, setTreeRefreshKey] = useState(0);

  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [loadingContent, setLoadingContent] = useState(true);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [organizaciones, setOrganizaciones] = useState<OrgOption[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<LibraryDocument | null>(null);
  const [renameTarget, setRenameTarget] = useState<
    { kind: "document"; item: LibraryDocument } | { kind: "folder"; item: LibraryFolder } | null
  >(null);
  const [moveDoc, setMoveDoc] = useState<LibraryDocument | null>(null);
  const [linkDoc, setLinkDoc] = useState<LibraryDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "document"; item: LibraryDocument } | { kind: "folder"; item: LibraryFolder } | null
  >(null);

  // ── Auth ──────────────────────────────────────────────────────
  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAccess() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/panel/login");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const r = profile?.role as string | undefined;
    if (r !== "super_admin" && r !== "admin" && r !== "colaborador") {
      router.push("/dashboard");
      return;
    }
    setRole(r as Role);
    setChecking(false);
  }

  // Solo admin/super_admin pueden listar organizaciones (requireAdmin en el endpoint).
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/organizaciones")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setOrganizaciones(res.organizaciones.map((o: { id: string; nombre: string }) => ({ id: o.id, nombre: o.nombre })));
      })
      .catch(() => {});
  }, [isAdmin]);

  // ── Carga de breadcrumb ───────────────────────────────────────
  useEffect(() => {
    if (checking) return;
    if (!currentFolderId) {
      setAncestors([]);
      return;
    }
    fetchFolder(currentFolderId, true).then((res) => {
      if (res.ok) setAncestors(res.ancestors ?? []);
    });
  }, [currentFolderId, checking]);

  // ── Carga de subcarpetas y documentos del nivel actual ─────────
  const loadContent = useCallback(async () => {
    if (checking) return;
    setLoadingContent(true);
    setError(null);

    const [foldersRes, documentsRes] = await Promise.all([
      fetchFolders({ repositoryType, parentFolderId: currentFolderId }),
      fetchDocuments({
        repository_type: repositoryType,
        folder_id: currentFolderId ?? "",
        q: search || undefined,
        page,
        page_size: pageSize,
        ...filters,
      }),
    ]);

    if (foldersRes.ok) setFolders(foldersRes.folders);
    else setError(foldersRes.error);

    if (documentsRes.ok) {
      setDocuments(documentsRes.items);
      setTotal(documentsRes.total);
    } else {
      setError(documentsRes.error);
    }
    setLoadingContent(false);
  }, [checking, repositoryType, currentFolderId, search, page, filters]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Repositorio cambia → volvemos a la raíz y limpiamos selección/filtros de página.
  function switchRepository(type: RepositoryType) {
    setRepositoryType(type);
    setCurrentFolderId(null);
    setSelectedIds(new Set());
    setPage(1);
  }

  function navigateToFolder(folderId: string | null) {
    setCurrentFolderId(folderId);
    setSelectedIds(new Set());
    setPage(1);
  }

  // ── Selección ─────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === documents.length ? new Set() : new Set(documents.map((d) => d.id))));
  }

  // ── Acciones ──────────────────────────────────────────────────
  async function handleDownload(doc: LibraryDocument) {
    const res = await fetchDownloadUrl(doc.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const a = document.createElement("a");
    a.href = res.url;
    a.download = doc.original_name;
    a.click();
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    const results = await Promise.all(ids.map((id) => deleteDocument(id)));
    const failed = results.filter((r) => !r.ok).length;
    if (failed > 0) setError(`${failed} de ${ids.length} documentos no se pudieron eliminar.`);
    else setNotice(`${ids.length} documento(s) eliminado(s).`);
    setSelectedIds(new Set());
    loadContent();
  }

  const tabs = useMemo(() => {
    const t = [{ id: "publica", label: "Pública" }];
    if (isAdmin) t.push({ id: "privada", label: "Privada" });
    return t;
  }, [isAdmin]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader />

      <main className="max-w-screen-2xl mx-auto px-5 sm:px-8 py-10 space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              ×
            </button>
          </p>
        )}
        {notice && (
          <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2 flex items-center justify-between">
            {notice}
            <button onClick={() => setNotice(null)} className="text-green-400 hover:text-green-700">
              ×
            </button>
          </p>
        )}

        <ViewTabBar
          title="Biblioteca"
          tabs={tabs}
          activeTab={repositoryType}
          onTabChange={(id) => switchRepository(id as RepositoryType)}
          rightSlot={
            <>
              <div className="relative w-40 sm:w-56">
                <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                <Input
                  placeholder="Buscar documentos..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="!py-2 !pl-9 w-full"
                />
              </div>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={Object.keys(filters).length > 0 ? "!border-orange !text-orange" : ""}
                >
                  <IconFilter className="w-4 h-4" />
                  Filtros
                </Button>
                {filtersOpen && (
                  <FiltersPanel
                    filters={filters}
                    onChange={(f) => {
                      setFilters(f);
                      setPage(1);
                    }}
                    organizaciones={organizaciones}
                    onClose={() => setFiltersOpen(false)}
                  />
                )}
              </div>
            </>
          }
        />

        <UploadDropzone
          repositoryType={repositoryType}
          folderId={currentFolderId}
          inputRef={uploadInputRef}
          onUploaded={() => loadContent()}
        >
          <div className="grid grid-cols-[220px_1fr] gap-5">
            {/* ── Árbol de carpetas ─────────────────────────────── */}
            <Card className="h-fit sticky top-24 max-h-[70vh] overflow-y-auto">
              <FolderTree
                repositoryType={repositoryType}
                currentFolderId={currentFolderId}
                onSelect={navigateToFolder}
                refreshKey={treeRefreshKey}
              />
            </Card>

            {/* ── Contenido ─────────────────────────────────────── */}
            <div className="space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Breadcrumb
                  repositoryLabel={repositoryType === "publica" ? "Biblioteca pública" : "Biblioteca privada"}
                  ancestors={ancestors}
                  onNavigate={navigateToFolder}
                />
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                      Eliminar ({selectedIds.size})
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setNewFolderOpen(true)}>
                    <IconPlus className="w-4 h-4" />
                    Nueva carpeta
                  </Button>
                  <Button size="sm" onClick={() => uploadInputRef.current?.click()}>
                    <IconUpload className="w-4 h-4" />
                    Subir archivos
                  </Button>
                </div>
              </div>

              <Card padded={false} className="overflow-hidden overflow-x-auto">
                <DocumentTable
                  folders={folders}
                  documents={documents}
                  loading={loadingContent}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  onOpenFolder={(f) => navigateToFolder(f.id)}
                  onOpenDocument={setPreviewDoc}
                  onFolderAction={(action, folder) => {
                    if (action === "rename") setRenameTarget({ kind: "folder", item: folder });
                    if (action === "delete") setDeleteTarget({ kind: "folder", item: folder });
                  }}
                  onDocumentAction={(action, doc) => {
                    if (action === "download") handleDownload(doc);
                    if (action === "rename") setRenameTarget({ kind: "document", item: doc });
                    if (action === "move") setMoveDoc(doc);
                    if (action === "link") setLinkDoc(doc);
                    if (action === "delete") setDeleteTarget({ kind: "document", item: doc });
                  }}
                />
              </Card>

              {total > pageSize && (
                <div className="flex items-center justify-between text-sm text-ink/50 px-1">
                  <span>
                    {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page * pageSize >= total}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </UploadDropzone>
      </main>

      {/* ── Modales ───────────────────────────────────────────── */}
      <NewFolderModal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        repositoryType={repositoryType}
        parentFolderId={currentFolderId}
        onCreated={() => {
          setTreeRefreshKey((k) => k + 1);
          loadContent();
        }}
      />

      <PreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />

      <RenameModal
        target={renameTarget}
        onClose={() => setRenameTarget(null)}
        onDone={() => {
          setTreeRefreshKey((k) => k + 1);
          loadContent();
        }}
      />

      <MoveModal
        document={moveDoc}
        repositoryType={repositoryType}
        onClose={() => setMoveDoc(null)}
        onDone={() => loadContent()}
      />

      <LinkModal document={linkDoc} onClose={() => setLinkDoc(null)} onDone={() => {}} />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title={deleteTarget?.kind === "folder" ? "Eliminar carpeta" : "Eliminar documento"}
        description={
          deleteTarget?.kind === "folder"
            ? `¿Eliminar la carpeta "${deleteTarget.item.nombre}"? Solo se puede borrar si está vacía.`
            : `¿Eliminar "${deleteTarget?.item ? (deleteTarget.item as LibraryDocument).title : ""}"? El archivo queda en el storage por si hace falta recuperarlo.`
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return { ok: false };
          const res =
            deleteTarget.kind === "folder" ? await deleteFolderApi(deleteTarget.item.id) : await deleteDocument(deleteTarget.item.id);
          if (res.ok) {
            setTreeRefreshKey((k) => k + 1);
            loadContent();
          }
          return res;
        }}
      />
    </div>
  );
}
