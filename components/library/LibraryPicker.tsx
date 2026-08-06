"use client";

/**
 * LibraryPicker — componente reutilizable para que cualquier otro
 * módulo de FACILIA (Personas, Organizaciones, Leads, RRHH, etc.)
 * permita elegir uno o varios documentos ya existentes en la
 * Biblioteca. No sube archivos nuevos — solo navega y selecciona.
 *
 * Uso básico:
 *   <LibraryPicker
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onSelect={(docs) => ...}
 *   />
 *
 * Uso con auto-vinculación (crea el link en /api/library/link al confirmar):
 *   <LibraryPicker
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onSelect={(docs) => ...}
 *     linkTo={{ entityType: "persona", entityId: persona.id }}
 *   />
 */

import { useEffect, useState } from "react";
import type { LibraryDocument, RepositoryType } from "@/lib/library/types";
import { fetchDocuments, linkDocument } from "@/lib/library/client";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Button from "@/components/Button";
import FolderTree from "./FolderTree";
import { fileEmoji, IconCheck, IconSearch } from "./icons";

interface LibraryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (documents: LibraryDocument[]) => void;
  /** Repositorio inicial. Por defecto "publica" (accesible a todo el staff). */
  defaultRepositoryType?: RepositoryType;
  /** Si el usuario también puede ver la biblioteca privada (isAdmin). */
  allowPrivada?: boolean;
  /** Permite elegir más de un documento. Por defecto false (selección única). */
  multiple?: boolean;
  /** Si se pasa, al confirmar la selección también crea el vínculo vía POST /api/library/link. */
  linkTo?: { entityType: string; entityId: string };
}

export default function LibraryPicker({
  open,
  onClose,
  onSelect,
  defaultRepositoryType = "publica",
  allowPrivada = false,
  multiple = false,
  linkTo,
}: LibraryPickerProps) {
  const [repositoryType, setRepositoryType] = useState<RepositoryType>(defaultRepositoryType);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Map<string, LibraryDocument>>(new Map());
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchDocuments({ repository_type: repositoryType, folder_id: folderId ?? "", q: search || undefined, page_size: 100 }).then(
      (res) => {
        if (res.ok) setDocuments(res.items);
        setLoading(false);
      }
    );
  }, [open, repositoryType, folderId, search]);

  useEffect(() => {
    if (!open) {
      setSelected(new Map());
      setError(null);
      setSearch("");
      setFolderId(null);
    }
  }, [open]);

  function toggle(doc: LibraryDocument) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(doc.id)) {
        next.delete(doc.id);
      } else {
        if (!multiple) next.clear();
        next.set(doc.id, doc);
      }
      return next;
    });
  }

  async function handleConfirm() {
    const docs = [...selected.values()];
    if (docs.length === 0) return;

    if (linkTo) {
      setLinking(true);
      setError(null);
      const results = await Promise.all(
        docs.map((d) => linkDocument({ document_id: d.id, entity_type: linkTo.entityType, entity_id: linkTo.entityId }))
      );
      setLinking(false);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        setError(`${failed.length} documento(s) no se pudieron vincular.`);
        return;
      }
    }

    onSelect(docs);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Elegir documento de la Biblioteca">
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRepositoryType("publica");
              setFolderId(null);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              repositoryType === "publica" ? "bg-navy text-white" : "bg-navy-50 text-ink/60"
            }`}
          >
            Pública
          </button>
          {allowPrivada && (
            <button
              onClick={() => {
                setRepositoryType("privada");
                setFolderId(null);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                repositoryType === "privada" ? "bg-navy text-white" : "bg-navy-50 text-ink/60"
              }`}
            >
              Privada
            </button>
          )}
          <div className="relative flex-1">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="!py-1.5 !pl-9" />
          </div>
        </div>

        <div className="grid grid-cols-[140px_1fr] gap-3">
          <div className="max-h-72 overflow-y-auto rounded-xl border border-navy-100 p-2">
            <FolderTree repositoryType={repositoryType} currentFolderId={folderId} onSelect={setFolderId} />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-navy-100 divide-y divide-navy-100">
            {loading && <p className="px-3 py-6 text-center text-sm text-ink/40">Cargando...</p>}
            {!loading && documents.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-ink/40">No hay documentos acá.</p>
            )}
            {!loading &&
              documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => toggle(doc)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                    selected.has(doc.id) ? "bg-navy-50" : "hover:bg-navy-50/50"
                  }`}
                >
                  <span className="shrink-0">{fileEmoji(doc.extension)}</span>
                  <span className="flex-1 truncate text-ink" title={doc.title}>
                    {doc.title}
                  </span>
                  {selected.has(doc.id) && <IconCheck className="w-4 h-4 text-navy shrink-0" />}
                </button>
              ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-ink/40">
            {selected.size > 0 ? `${selected.size} seleccionado(s)` : "Elegí uno o más documentos"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleConfirm} loading={linking} disabled={selected.size === 0}>
              Usar seleccionado{selected.size === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
