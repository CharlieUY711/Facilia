import { Folder } from "../../domain/entities/Folder";
import { RepositoryType } from "../../domain/value-objects/RepositoryType";
import { FolderDTO } from "../../application/dto/FolderDTO";

export interface LibraryFolderRow {
  id: string;
  organization_id: string;
  repository_type: "PUBLIC" | "PRIVATE";
  parent_folder_id: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class FolderMapper {
  static toDomain(row: LibraryFolderRow): Folder {
    return Folder.reconstitute({
      id: row.id,
      organizationId: row.organization_id,
      repositoryType: RepositoryType.fromString(row.repository_type),
      parentFolderId: row.parent_folder_id,
      name: row.name,
      description: row.description,
      sortOrder: row.sort_order,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    });
  }

  static toRow(folder: Folder): Omit<LibraryFolderRow, "created_at" | "updated_at"> {
    const props = folder.toProps();
    return {
      id: props.id,
      organization_id: props.organizationId,
      repository_type: props.repositoryType.toString(),
      parent_folder_id: props.parentFolderId,
      name: props.name,
      description: props.description,
      sort_order: props.sortOrder,
      created_by: props.createdBy,
      updated_by: props.updatedBy,
      deleted_at: props.deletedAt ? props.deletedAt.toISOString() : null,
    };
  }

  static toDTO(folder: Folder): FolderDTO {
    const props = folder.toProps();
    return {
      id: props.id,
      organizationId: props.organizationId,
      repositoryType: props.repositoryType.toString(),
      parentFolderId: props.parentFolderId,
      name: props.name,
      description: props.description,
      createdBy: props.createdBy,
      updatedBy: props.updatedBy,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  }
}
