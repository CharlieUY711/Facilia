"use client";

// Helpers de cliente para /api/library/*. Solo tipos y fetch — nada
// de acá corre en el servidor, así que es seguro importarlo desde
// componentes "use client".

import type {
  ApiResult,
  DocumentFilters,
  LibraryDocument,
  LibraryDocumentLink,
  LibraryFolder,
  PaginatedResult,
  RepositoryType,
} from "./types";

async function asJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

// ── Carpetas ────────────────────────────────────────────────────

export async function fetchFolders(params: {
  repositoryType: RepositoryType;
  parentFolderId?: string | null;
}): Promise<ApiResult<{ folders: LibraryFolder[] }>> {
  const sp = new URLSearchParams({ repository_type: params.repositoryType });
  if (params.parentFolderId) sp.set("parent_folder_id", params.parentFolderId);
  const res = await fetch(`/api/library/folders?${sp.toString()}`);
  return asJson(res);
}

export async function fetchFolder(
  id: string,
  withAncestors = false
): Promise<ApiResult<{ folder: LibraryFolder; ancestors?: LibraryFolder[] }>> {
  const sp = withAncestors ? "?with_ancestors=1" : "";
  const res = await fetch(`/api/library/folders/${id}${sp}`);
  return asJson(res);
}

export async function createFolder(input: {
  repository_type: RepositoryType;
  nombre: string;
  parent_folder_id?: string | null;
  organizacion_id?: string | null;
  descripcion?: string | null;
}): Promise<ApiResult<{ folder: LibraryFolder }>> {
  const res = await fetch("/api/library/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return asJson(res);
}

export async function updateFolder(
  id: string,
  input: { nombre?: string; descripcion?: string | null; parent_folder_id?: string | null; orden?: number }
): Promise<ApiResult<{ folder: LibraryFolder }>> {
  const res = await fetch(`/api/library/folders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return asJson(res);
}

export async function deleteFolder(id: string): Promise<ApiResult> {
  const res = await fetch(`/api/library/folders/${id}`, { method: "DELETE" });
  return asJson(res);
}

// ── Documentos ──────────────────────────────────────────────────

export async function fetchDocuments(
  filters: DocumentFilters
): Promise<({ ok: true } & PaginatedResult<LibraryDocument>) | { ok: false; error: string }> {
  const sp = new URLSearchParams();
  if (filters.repository_type) sp.set("repository_type", filters.repository_type);
  if (filters.folder_id !== undefined) sp.set("folder_id", filters.folder_id ?? "");
  if (filters.q) sp.set("q", filters.q);
  if (filters.extension) sp.set("extension", filters.extension);
  if (filters.mime_type) sp.set("mime_type", filters.mime_type);
  if (filters.organizacion_id) sp.set("organizacion_id", filters.organizacion_id);
  if (filters.created_by) sp.set("created_by", filters.created_by);
  if (filters.date_from) sp.set("date_from", filters.date_from);
  if (filters.date_to) sp.set("date_to", filters.date_to);
  if (filters.page) sp.set("page", String(filters.page));
  if (filters.page_size) sp.set("page_size", String(filters.page_size));

  const res = await fetch(`/api/library/documents?${sp.toString()}`);
  return asJson(res);
}

export async function fetchDocument(id: string): Promise<ApiResult<{ document: LibraryDocument }>> {
  const res = await fetch(`/api/library/documents/${id}`);
  return asJson(res);
}

export async function updateDocument(
  id: string,
  input: { title?: string; description?: string | null; folder_id?: string | null; organizacion_id?: string | null }
): Promise<ApiResult<{ document: LibraryDocument }>> {
  const res = await fetch(`/api/library/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return asJson(res);
}

export async function deleteDocument(id: string): Promise<ApiResult> {
  const res = await fetch(`/api/library/documents/${id}`, { method: "DELETE" });
  return asJson(res);
}

export async function fetchDownloadUrl(
  id: string
): Promise<ApiResult<{ url: string; document: LibraryDocument }>> {
  const res = await fetch(`/api/library/download/${id}`);
  return asJson(res);
}

export async function fetchEntityDocuments(
  entityType: string,
  entityId: string
): Promise<ApiResult<{ documents: LibraryDocument[] }>> {
  const sp = new URLSearchParams({ entity_type: entityType, entity_id: entityId });
  const res = await fetch(`/api/library/link?${sp.toString()}`);
  return asJson(res);
}

export async function linkDocument(input: {
  document_id: string;
  entity_type: string;
  entity_id: string;
}): Promise<ApiResult<{ link: LibraryDocumentLink }>> {
  const res = await fetch("/api/library/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return asJson(res);
}

export async function unlinkDocument(input: {
  document_id: string;
  entity_type: string;
  entity_id: string;
}): Promise<ApiResult> {
  const res = await fetch("/api/library/link", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return asJson(res);
}

// ── Upload (con progreso, vía XHR porque fetch no expone progress) ─

export interface UploadInput {
  file: File;
  repository_type: RepositoryType;
  folder_id?: string | null;
  organizacion_id?: string | null;
  title?: string;
  description?: string;
}

export function uploadDocument(
  input: UploadInput,
  onProgress?: (pct: number) => void
): { promise: Promise<ApiResult<{ document: LibraryDocument }>>; abort: () => void } {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<ApiResult<{ document: LibraryDocument }>>((resolve) => {
    const form = new FormData();
    form.append("file", input.file);
    form.append("repository_type", input.repository_type);
    if (input.folder_id) form.append("folder_id", input.folder_id);
    if (input.organizacion_id) form.append("organizacion_id", input.organizacion_id);
    if (input.title) form.append("title", input.title);
    if (input.description) form.append("description", input.description);

    xhr.open("POST", "/api/library/upload");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        resolve({ ok: false, error: "Respuesta inválida del servidor." });
      }
    };

    xhr.onerror = () => resolve({ ok: false, error: "Error de red al subir el archivo." });
    xhr.onabort = () => resolve({ ok: false, error: "Subida cancelada." });

    xhr.send(form);
  });

  return { promise, abort: () => xhr.abort() };
}

// ── Utilidades de presentación ─────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function isPreviewable(doc: Pick<LibraryDocument, "mime_type" | "extension">): "image" | "pdf" | null {
  if (doc.mime_type?.startsWith("image/")) return "image";
  if (doc.mime_type === "application/pdf" || doc.extension === "pdf") return "pdf";
  return null;
}
