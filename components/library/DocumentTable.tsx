"use client";

import { useMemo, useState } from "react";
import type { LibraryDocument, LibraryFolder } from "@/lib/library/types";
import { formatFileSize } from "@/lib/library/client";
import { fileEmoji, IconFolder, IconMore, IconChevronDown } from "./icons";

export type SortField = "nombre" | "file_size" | "created_at" | "extension";
export type SortDir = "asc" | "desc";

interface DocumentTableProps {
  folders: LibraryFolder[];
  documents: LibraryDocument[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenFolder: (folder: LibraryFolder) => void;
  onOpenDocument: (doc: LibraryDocument) => void;
  onFolderAction: (action: "rename" | "delete", folder: LibraryFolder) => void;
  onDocumentAction: (action: "download" | "rename" | "move" | "link" | "delete", doc: LibraryDocument) => void;
}

export default function DocumentTable({
  folders,
  documents,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenFolder,
  onOpenDocument,
  onFolderAction,
  onDocumentAction,
}: DocumentTableProps) {
  const [sortField, setSortField] = useState<SortField>("nombre");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [menuFor, setMenuFor] = useState<string | null>(null);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sortedDocuments = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...documents].sort((a, b) => {
      switch (sortField) {
        case "file_size":
          return (a.file_size - b.file_size) * factor;
        case "created_at":
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * factor;
        case "extension":
          return (a.extension ?? "").localeCompare(b.extension ?? "") * factor;
        default:
          return a.title.localeCompare(b.title, "es") * factor;
      }
    });
  }, [documents, sortField, sortDir]);

  const allSelected = documents.length > 0 && documents.every((d) => selectedIds.has(d.id));
  const totalRows = folders.length + documents.length;

  if (loading) {
    return <p className="px-5 py-10 text-center text-sm text-ink/40">Cargando...</p>;
  }

  if (totalRows === 0) {
    return (
      <div className="px-5 py-14 text-center">
        <p className="text-sm text-ink/40">Esta carpeta está vacía.</p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-ink/50 border-b border-navy-100">
          <th className="px-4 py-3 w-8">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              disabled={documents.length === 0}
              className="rounded border-navy-300 accent-navy"
            />
          </th>
          <SortableHeader label="Nombre" field="nombre" active={sortField} dir={sortDir} onClick={toggleSort} />
          <SortableHeader label="Tipo" field="extension" active={sortField} dir={sortDir} onClick={toggleSort} />
          <SortableHeader label="Tamaño" field="file_size" active={sortField} dir={sortDir} onClick={toggleSort} />
          <SortableHeader label="Subido" field="created_at" active={sortField} dir={sortDir} onClick={toggleSort} />
          <th className="px-4 py-3 w-10" />
        </tr>
      </thead>
      <tbody className="divide-y divide-navy-100">
        {folders.map((folder) => (
          <tr key={folder.id} className="hover:bg-navy-50/40 transition-colors group">
            <td className="px-4 py-2.5" />
            <td className="px-4 py-2.5 cursor-pointer" onClick={() => onOpenFolder(folder)}>
              <div className="flex items-center gap-2.5 font-medium text-navy">
                <IconFolder className="w-4 h-4 shrink-0 text-orange" />
                <span className="truncate max-w-[360px]" title={folder.nombre}>
                  {folder.nombre}
                </span>
              </div>
            </td>
            <td className="px-4 py-2.5 text-ink/50">Carpeta</td>
            <td className="px-4 py-2.5 text-ink/40">—</td>
            <td className="px-4 py-2.5 text-ink/50 whitespace-nowrap">
              {new Date(folder.created_at).toLocaleDateString("es-UY")}
            </td>
            <td className="px-4 py-2.5 relative">
              <RowMenuButton id={`folder-${folder.id}`} open={menuFor} setOpen={setMenuFor} />
              {menuFor === `folder-${folder.id}` && (
                <RowMenu
                  onClose={() => setMenuFor(null)}
                  items={[
                    { label: "Renombrar", onClick: () => onFolderAction("rename", folder) },
                    { label: "Eliminar", danger: true, onClick: () => onFolderAction("delete", folder) },
                  ]}
                />
              )}
            </td>
          </tr>
        ))}

        {sortedDocuments.map((doc) => (
          <tr key={doc.id} className="hover:bg-navy-50/40 transition-colors">
            <td className="px-4 py-2.5">
              <input
                type="checkbox"
                checked={selectedIds.has(doc.id)}
                onChange={() => onToggleSelect(doc.id)}
                className="rounded border-navy-300 accent-navy"
              />
            </td>
            <td className="px-4 py-2.5 cursor-pointer" onClick={() => onOpenDocument(doc)}>
              <div className="flex items-center gap-2.5">
                <span className="text-base shrink-0">{fileEmoji(doc.extension)}</span>
                <span className="font-medium text-ink truncate max-w-[360px]" title={doc.title}>
                  {doc.title}
                </span>
              </div>
            </td>
            <td className="px-4 py-2.5 text-ink/50 uppercase text-xs tracking-wide">{doc.extension ?? "—"}</td>
            <td className="px-4 py-2.5 text-ink/50 whitespace-nowrap">{formatFileSize(doc.file_size)}</td>
            <td className="px-4 py-2.5 text-ink/50 whitespace-nowrap">
              {new Date(doc.created_at).toLocaleDateString("es-UY")}
            </td>
            <td className="px-4 py-2.5 relative">
              <RowMenuButton id={`doc-${doc.id}`} open={menuFor} setOpen={setMenuFor} />
              {menuFor === `doc-${doc.id}` && (
                <RowMenu
                  onClose={() => setMenuFor(null)}
                  items={[
                    { label: "Descargar", onClick: () => onDocumentAction("download", doc) },
                    { label: "Renombrar", onClick: () => onDocumentAction("rename", doc) },
                    { label: "Mover", onClick: () => onDocumentAction("move", doc) },
                    { label: "Vincular a...", onClick: () => onDocumentAction("link", doc) },
                    { label: "Eliminar", danger: true, onClick: () => onDocumentAction("delete", doc) },
                  ]}
                />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SortableHeader({
  label,
  field,
  active,
  dir,
  onClick,
}: {
  label: string;
  field: SortField;
  active: SortField;
  dir: SortDir;
  onClick: (f: SortField) => void;
}) {
  const isActive = active === field;
  return (
    <th className="px-4 py-3 font-medium select-none">
      <button onClick={() => onClick(field)} className="flex items-center gap-1 hover:text-navy transition-colors">
        {label}
        {isActive && <IconChevronDown className={`w-3.5 h-3.5 transition-transform ${dir === "desc" ? "rotate-180" : ""}`} />}
      </button>
    </th>
  );
}

function RowMenuButton({
  id,
  open,
  setOpen,
}: {
  id: string;
  open: string | null;
  setOpen: (v: string | null) => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setOpen(open === id ? null : id);
      }}
      className="p-1.5 rounded-lg text-ink/40 hover:text-navy hover:bg-navy-50 transition-colors"
      aria-label="Más acciones"
    >
      <IconMore className="w-4 h-4" />
    </button>
  );
}

function RowMenu({
  items,
  onClose,
}: {
  items: { label: string; onClick: () => void; danger?: boolean }[];
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-4 top-9 z-20 w-44 rounded-xl border border-navy-100 bg-white shadow-soft py-1">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
              onClose();
            }}
            className={`w-full text-left px-3.5 py-2 text-sm hover:bg-navy-50 transition-colors ${
              item.danger ? "text-red-600" : "text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
