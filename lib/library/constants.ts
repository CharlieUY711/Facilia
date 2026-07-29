import type { RepositoryType } from "./types";

/**
 * Nombres de los buckets de Supabase Storage. Nunca hardcodear el
 * string en otro archivo — importar siempre desde acá.
 */
export const LIBRARY_BUCKETS: Record<RepositoryType, string> = {
  publica: "public-library",
  privada: "private-library",
};

export function bucketForRepository(repositoryType: RepositoryType): string {
  return LIBRARY_BUCKETS[repositoryType];
}

/** Duración (segundos) de las signed URLs de descarga/preview. */
export const SIGNED_URL_EXPIRES_SECONDS = 300;

/** Tamaño máximo por archivo: 50 MB. */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Extensiones permitidas. Lista intencionalmente amplia (documentos
 * de oficina, imágenes, comprimidos, audio/video y texto plano) —
 * ampliar acá si el negocio lo requiere.
 */
export const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "csv",
  "txt",
  "rtf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "zip",
  "rar",
  "7z",
  "mp4",
  "mov",
  "avi",
  "mp3",
  "wav",
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const DOCUMENT_PAGE_SIZE_DEFAULT = 50;
export const DOCUMENT_PAGE_SIZE_MAX = 200;
