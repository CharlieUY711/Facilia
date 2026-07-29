import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "./constants";
import type { RepositoryType } from "./types";

export function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return (parts.pop() || "").toLowerCase();
}

export function isValidRepositoryType(value: unknown): value is RepositoryType {
  return value === "publica" || value === "privada";
}

/**
 * Valida un archivo antes de subirlo. Devuelve un mensaje de error
 * en español (mismo estilo que el resto de las API routes) o null
 * si está todo bien.
 */
export function validateUploadFile(file: { name: string; size: number }): string | null {
  if (!file.name || !file.name.trim()) {
    return "El archivo no tiene nombre.";
  }
  if (file.size <= 0) {
    return "El archivo está vacío.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    return `El archivo supera el tamaño máximo permitido (${maxMb} MB).`;
  }
  const ext = getExtension(file.name);
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return `Extensión ".${ext || "?"}" no permitida.`;
  }
  return null;
}

/** Sanitiza un nombre de carpeta o título: recorta espacios y largo. */
export function sanitizeName(value: string, maxLength = 200): string {
  return value.trim().slice(0, maxLength);
}
