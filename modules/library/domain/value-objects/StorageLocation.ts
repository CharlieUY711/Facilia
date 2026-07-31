import { RepositoryType } from "./RepositoryType";
import {
  PRIVATE_LIBRARY_BUCKET,
  PUBLIC_LIBRARY_BUCKET,
} from "../../infrastructure/constants/storage-buckets";

export interface StorageLocationProps {
  bucket: string;
  path: string;
}

export class StorageLocation {
  private constructor(
    public readonly bucket: string,
    public readonly path: string
  ) {}

  static create(props: StorageLocationProps): StorageLocation {
    if (!props.bucket) throw new Error("El bucket de storage es requerido");
    if (!props.path) throw new Error("El path de storage es requerido");
    return new StorageLocation(props.bucket, props.path);
  }

  static buildPath(params: {
    organizationId: string;
    repositoryType: RepositoryType;
    folderId: string | null;
    documentId: string;
    extension: string;
  }): StorageLocation {
    const bucket = params.repositoryType.isPublic()
      ? PUBLIC_LIBRARY_BUCKET
      : PRIVATE_LIBRARY_BUCKET;
    const folderSegment = params.folderId ?? "root";
    const path = `${params.organizationId}/${params.repositoryType.toString()}/${folderSegment}/${params.documentId}.${params.extension}`;
    return new StorageLocation(bucket, path);
  }
}
