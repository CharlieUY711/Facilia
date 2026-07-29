import { createServiceClient } from "@/lib/supabase/server";
import { SIGNED_URL_EXPIRES_SECONDS } from "./constants";

/**
 * Sube un archivo al bucket indicado. Devuelve el storage_path
 * generado (uuid + extensión) o lanza si Supabase Storage falla.
 */
export async function uploadFileToStorage(params: {
  bucket: string;
  path: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ error: string | null }> {
  const service = createServiceClient();
  const { error } = await service.storage
    .from(params.bucket)
    .upload(params.path, params.buffer, {
      contentType: params.contentType || "application/octet-stream",
      upsert: false,
    });

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteFileFromStorage(params: {
  bucket: string;
  path: string;
}): Promise<{ error: string | null }> {
  const service = createServiceClient();
  const { error } = await service.storage.from(params.bucket).remove([params.path]);
  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Mueve/renombra un objeto dentro del mismo bucket. Se usa cuando un
 * documento cambia de repositorio (publica ⇄ privada implica cambiar
 * de bucket, por eso ese caso se maneja como delete+upload en el
 * caso de uso, no acá) o cuando conviene reordenar el storage_path.
 */
export async function moveFileInStorage(params: {
  bucket: string;
  fromPath: string;
  toPath: string;
}): Promise<{ error: string | null }> {
  const service = createServiceClient();
  const { error } = await service.storage.from(params.bucket).move(params.fromPath, params.toPath);
  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Genera una signed URL de corta duración para ver/descargar un
 * archivo. Los buckets son privados — nunca se sirve una URL pública.
 */
export async function getSignedDownloadUrl(params: {
  bucket: string;
  path: string;
  expiresIn?: number;
}): Promise<{ url: string | null; error: string | null }> {
  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(params.bucket)
    .createSignedUrl(params.path, params.expiresIn ?? SIGNED_URL_EXPIRES_SECONDS);

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}
