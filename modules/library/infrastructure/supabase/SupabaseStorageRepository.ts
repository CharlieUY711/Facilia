import type { SupabaseClient } from "@supabase/supabase-js";
import { StorageRepository } from "../../domain/repositories/StorageRepository";
import { StorageLocation } from "../../domain/value-objects/StorageLocation";

export class SupabaseStorageRepository implements StorageRepository {
  constructor(private readonly client: SupabaseClient) {}

  async upload(location: StorageLocation, file: Buffer | Blob, contentType: string): Promise<void> {
    const { error } = await this.client.storage
      .from(location.bucket)
      .upload(location.path, file, { contentType, upsert: false });
    if (error) throw new Error(`Error al subir archivo: ${error.message}`);
  }

  async delete(location: StorageLocation): Promise<void> {
    const { error } = await this.client.storage.from(location.bucket).remove([location.path]);
    if (error) throw new Error(`Error al eliminar archivo del storage: ${error.message}`);
  }

  async move(from: StorageLocation, to: StorageLocation): Promise<void> {
    if (from.bucket !== to.bucket) {
      throw new Error("No se permite mover archivos entre buckets distintos");
    }
    const { error } = await this.client.storage.from(from.bucket).move(from.path, to.path);
    if (error) throw new Error(`Error al mover archivo en storage: ${error.message}`);
  }

  async getSignedDownloadUrl(location: StorageLocation, expiresInSeconds: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(location.bucket)
      .createSignedUrl(location.path, expiresInSeconds, { download: true });
    if (error || !data) throw new Error(`Error al generar URL de descarga: ${error?.message ?? "desconocido"}`);
    return data.signedUrl;
  }

  async getSignedPreviewUrl(location: StorageLocation, expiresInSeconds: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(location.bucket)
      .createSignedUrl(location.path, expiresInSeconds);
    if (error || !data) throw new Error(`Error al generar URL de preview: ${error?.message ?? "desconocido"}`);
    return data.signedUrl;
  }
}
