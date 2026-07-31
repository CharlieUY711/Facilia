import { StorageLocation } from "../value-objects/StorageLocation";

export interface StorageRepository {
  upload(location: StorageLocation, file: Buffer | Blob, contentType: string): Promise<void>;
  delete(location: StorageLocation): Promise<void>;
  move(from: StorageLocation, to: StorageLocation): Promise<void>;
  getSignedDownloadUrl(location: StorageLocation, expiresInSeconds: number): Promise<string>;
  getSignedPreviewUrl(location: StorageLocation, expiresInSeconds: number): Promise<string>;
}
