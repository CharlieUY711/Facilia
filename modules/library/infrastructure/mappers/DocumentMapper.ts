import { Document } from "../../domain/entities/Document";
import { RepositoryType } from "../../domain/value-objects/RepositoryType";
import { Visibility } from "../../domain/value-objects/Visibility";
import { DocumentStatus } from "../../domain/value-objects/DocumentStatus";
import { FileMetadata } from "../../domain/value-objects/FileMetadata";
import { StorageLocation } from "../../domain/value-objects/StorageLocation";
import { DocumentDTO } from "../../application/dto/DocumentDTO";

export interface LibraryDocumentRow {
  id: string;
  organization_id: string;
  repository_type: "PUBLIC" | "PRIVATE";
  folder_id: string | null;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  original_name: string;
  extension: string;
  mime_type: string;
  file_size: number;
  title: string;
  description: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  status: "ACTIVE" | "DELETED";
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class DocumentMapper {
  static toDomain(row: LibraryDocumentRow): Document {
    return Document.reconstitute({
      id: row.id,
      organizationId: row.organization_id,
      repositoryType: RepositoryType.fromString(row.repository_type),
      folderId: row.folder_id,
      storageLocation: StorageLocation.create({
        bucket: row.storage_bucket,
        path: row.storage_path,
      }),
      metadata: FileMetadata.create({
        originalName: row.original_name,
        extension: row.extension,
        mimeType: row.mime_type,
        sizeInBytes: row.file_size,
      }),
      title: row.title,
      description: row.description,
      visibility: Visibility.fromString(row.visibility),
      status: DocumentStatus.fromString(row.status),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    });
  }

  static toRow(document: Document, fileName: string): Omit<LibraryDocumentRow, "created_at" | "updated_at"> {
    const props = document.toProps();
    return {
      id: props.id,
      organization_id: props.organizationId,
      repository_type: props.repositoryType.toString(),
      folder_id: props.folderId,
      storage_bucket: props.storageLocation.bucket,
      storage_path: props.storageLocation.path,
      file_name: fileName,
      original_name: props.metadata.originalName,
      extension: props.metadata.extension,
      mime_type: props.metadata.mimeType,
      file_size: props.metadata.sizeInBytes,
      title: props.title,
      description: props.description,
      visibility: props.visibility.toString(),
      status: props.status.toString(),
      created_by: props.createdBy,
      updated_by: props.updatedBy,
      deleted_at: props.deletedAt ? props.deletedAt.toISOString() : null,
    };
  }

  static toDTO(document: Document): DocumentDTO {
    const props = document.toProps();
    return {
      id: props.id,
      organizationId: props.organizationId,
      repositoryType: props.repositoryType.toString(),
      folderId: props.folderId,
      fileName: `${props.id}.${props.metadata.extension}`,
      originalName: props.metadata.originalName,
      extension: props.metadata.extension,
      mimeType: props.metadata.mimeType,
      fileSize: props.metadata.sizeInBytes,
      title: props.title,
      description: props.description,
      visibility: props.visibility.toString(),
      status: props.status.toString(),
      createdBy: props.createdBy,
      updatedBy: props.updatedBy,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  }
}
