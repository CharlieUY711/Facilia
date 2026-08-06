"use client";

import { useEffect, useState } from "react";
import type { LibraryDocument } from "@/lib/library/types";
import { fetchDownloadUrl, formatFileSize, isPreviewable } from "@/lib/library/client";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { fileEmoji, IconDownload } from "./icons";

interface PreviewModalProps {
  document: LibraryDocument | null;
  onClose: () => void;
}

export default function PreviewModal({ document, onClose }: PreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!document) return;
    setUrl(null);
    setError(null);
    setLoading(true);
    fetchDownloadUrl(document.id).then((res) => {
      if (res.ok) setUrl(res.url);
      else setError(res.error);
      setLoading(false);
    });
  }, [document]);

  if (!document) return null;

  const kind = isPreviewable(document);

  return (
    <Modal open={!!document} onClose={onClose} title={document.title}>
      <div className="space-y-4">
        {loading && <p className="text-sm text-ink/40 py-10 text-center">Generando vista previa...</p>}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

        {url && kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={document.title} className="max-h-[60vh] w-full object-contain rounded-xl bg-navy-50" />
        )}

        {url && kind === "pdf" && (
          <iframe src={url} title={document.title} className="w-full h-[65vh] rounded-xl border border-navy-100" />
        )}

        {url && !kind && (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">{fileEmoji(document.extension)}</span>
            <p className="text-sm text-ink/60">No hay vista previa disponible para este tipo de archivo.</p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-ink/50 pt-2 border-t border-navy-100">
          <span>
            {formatFileSize(document.file_size)} · {document.extension?.toUpperCase() ?? "—"} ·{" "}
            {new Date(document.created_at).toLocaleDateString("es-UY")}
          </span>
          {url && (
            <a href={url} download={document.original_name}>
              <Button size="sm" variant="ghost">
                <IconDownload className="w-4 h-4" />
                Descargar
              </Button>
            </a>
          )}
        </div>

        {document.description && <p className="text-sm text-ink/70">{document.description}</p>}
      </div>
    </Modal>
  );
}
