"use client";

import { ReactNode, useCallback, useRef, useState } from "react";
import type { LibraryDocument, RepositoryType } from "@/lib/library/types";
import { formatFileSize, uploadDocument } from "@/lib/library/client";
import { IconCheck, IconUpload, IconX } from "./icons";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  abort: () => void;
}

interface UploadDropzoneProps {
  repositoryType: RepositoryType;
  folderId: string | null;
  organizacionId?: string | null;
  onUploaded: (doc: LibraryDocument) => void;
  children: ReactNode;
  /** Ref expuesta para disparar el selector de archivos desde el toolbar externo. */
  inputRef: React.RefObject<HTMLInputElement>;
}

export default function UploadDropzone({
  repositoryType,
  folderId,
  organizacionId,
  onUploaded,
  children,
  inputRef,
}: UploadDropzoneProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  const startUpload = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      for (const file of list) {
        const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const { promise, abort } = uploadDocument(
          { file, repository_type: repositoryType, folder_id: folderId, organizacion_id: organizacionId ?? null },
          (pct) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, progress: pct } : it)))
        );
        setItems((prev) => [...prev, { id, file, progress: 0, status: "uploading", abort }]);

        promise.then((res) => {
          if (res.ok) {
            setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "done", progress: 100 } : it)));
            onUploaded(res.document);
            setTimeout(() => setItems((prev) => prev.filter((it) => it.id !== id)), 2500);
          } else {
            setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "error", error: res.error } : it)));
          }
        });
      }
    },
    [repositoryType, folderId, organizacionId, onUploaded]
  );

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDraggingOver(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    if (e.dataTransfer.files?.length) startUpload(e.dataTransfer.files);
  }

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) startUpload(e.target.files);
          e.target.value = "";
        }}
      />

      {isDraggingOver && (
        <div className="absolute inset-0 z-30 rounded-2xl border-2 border-dashed border-orange bg-orange-50/90 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-orange-700">
            <IconUpload className="w-8 h-8" />
            <p className="font-display font-semibold">Soltá los archivos para subirlos</p>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="fixed bottom-5 right-5 z-40 w-80 max-h-[60vh] overflow-y-auto rounded-2xl border border-navy-100 bg-white shadow-soft">
          <div className="px-4 py-3 border-b border-navy-100 font-display font-semibold text-navy text-sm">
            Subiendo {items.filter((i) => i.status === "uploading").length || ""} archivo{items.length === 1 ? "" : "s"}
          </div>
          <div className="divide-y divide-navy-100">
            {items.map((item) => (
              <div key={item.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-ink/80" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <span className="text-ink/40 shrink-0">{formatFileSize(item.file.size)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-navy-50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.status === "error" ? "bg-red-500" : "bg-orange"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.status === "uploading" && (
                    <button onClick={() => item.abort()} className="text-ink/30 hover:text-red-600" aria-label="Cancelar">
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {item.status === "done" && <IconCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                  {item.status === "error" && (
                    <button
                      onClick={() => setItems((prev) => prev.filter((it) => it.id !== item.id))}
                      className="text-ink/30 hover:text-ink"
                      aria-label="Cerrar"
                    >
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {item.status === "error" && <p className="mt-1 text-xs text-red-600">{item.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
