"use client";

/**
 * EntityDocuments — sección "Documentos" para pegar en la ficha de
 * cualquier entidad de FACILIA (Organización, Persona, Lead, etc.).
 * Lista lo ya vinculado (GET /api/library/link) y permite adjuntar
 * documentos existentes de la Biblioteca vía LibraryPicker (que ya
 * hace el POST /api/library/link al confirmar).
 *
 * Uso:
 *   <EntityDocuments entityType="organizacion" entityId={org.id} allowPrivada={isAdmin} />
 */

import { useCallback, useEffect, useState } from "react";
import type { LibraryDocument } from "@/lib/library/types";
import { fetchDownloadUrl, fetchEntityDocuments, formatFileSize, unlinkDocument } from "@/lib/library/client";
import Card from "@/components/Card";
import Button from "@/components/Button";
import LibraryPicker from "./LibraryPicker";
import PreviewModal from "./PreviewModal";
import { fileEmoji, IconPlus, IconX } from "./icons";

interface EntityDocumentsProps {
  entityType: string;
  entityId: string;
  /** Si el usuario actual es admin/super_admin, se le habilita elegir también desde la biblioteca privada. */
  allowPrivada?: boolean;
  title?: string;
}

export default function EntityDocuments({ entityType, entityId, allowPrivada = false, title = "Documentos" }: EntityDocumentsProps) {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<LibraryDocument | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchEntityDocuments(entityType, entityId);
    if (res.ok) setDocuments(res.documents);
    else setError(res.error);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUnlink(doc: LibraryDocument) {
    setUnlinkingId(doc.id);
    const res = await unlinkDocument({ document_id: doc.id, entity_type: entityType, entity_id: entityId });
    setUnlinkingId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  }

  async function handleDownload(doc: LibraryDocument) {
    const res = await fetchDownloadUrl(doc.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    window.open(res.url, "_blank", "noopener,noreferrer");
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-navy">{title}</h3>
        <Button size="sm" variant="ghost" onClick={() => setPickerOpen(true)}>
          <IconPlus className="w-4 h-4" />
          Adjuntar de la Biblioteca
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            ×
          </button>
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink/40">Cargando...</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-ink/40">No hay documentos adjuntos todavía.</p>
      ) : (
        <div className="divide-y divide-navy-100">
          {documents.map((doc) => (
            <div key={doc.id} className="py-2.5 flex items-center justify-between gap-2">
              <button
                onClick={() => setPreviewDoc(doc)}
                className="flex items-center gap-2.5 text-left min-w-0 hover:opacity-80"
              >
                <span className="shrink-0">{fileEmoji(doc.extension)}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-navy truncate max-w-[280px]" title={doc.title}>
                    {doc.title}
                  </span>
                  <span className="block text-xs text-ink/40">{formatFileSize(doc.file_size)}</span>
                </span>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)}>
                  Descargar
                </Button>
                <button
                  onClick={() => handleUnlink(doc)}
                  disabled={unlinkingId === doc.id}
                  className="p-1.5 rounded-lg text-ink/30 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                  aria-label="Quitar de esta ficha"
                  title="Quitar de esta ficha (no borra el documento de la Biblioteca)"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <LibraryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={() => load()}
        allowPrivada={allowPrivada}
        multiple
        linkTo={{ entityType, entityId }}
      />

      <PreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />
    </Card>
  );
}
