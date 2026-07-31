import { RepositoryType } from "../value-objects/RepositoryType";
import { Visibility } from "../value-objects/Visibility";
import { DocumentStatus } from "../value-objects/DocumentStatus";
import { FileMetadata } from "../value-objects/FileMetadata";
import { StorageLocation } from "../value-objects/StorageLocation";

export interface DocumentProps {
  id: string;
  organizationId: string;
  repositoryType: RepositoryType;
  folderId: string | null;
  storageLocation: StorageLocation;
  metadata: FileMetadata;
  title: string;
  description: string | null;
  visibility: Visibility;
  status: DocumentStatus;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Document {
  private constructor(private props: DocumentProps) {}

  static create(props: {
    id: string;
    organizationId: string;
    repositoryType: RepositoryType;
    folderId: string | null;
    storageLocation: StorageLocation;
    metadata: FileMetadata;
    title?: string;
    description?: string | null;
    visibility: Visibility;
    createdBy: string;
  }): Document {
    const now = new Date();
    return new Document({
      id: props.id,
      organizationId: props.organizationId,
      repositoryType: props.repositoryType,
      folderId: props.folderId,
      storageLocation: props.storageLocation,
      metadata: props.metadata,
      title: props.title?.trim() || props.metadata.originalName,
      description: props.description ?? null,
      visibility: props.visibility,
      status: DocumentStatus.ACTIVE,
      createdBy: props.createdBy,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static reconstitute(props: DocumentProps): Document {
    return new Document(props);
  }

  rename(newTitle: string, userId: string): void {
    const trimmed = newTitle?.trim();
    if (!trimmed) {
      throw new Error("El nuevo titulo es requerido");
    }
    this.props.title = trimmed;
    this.props.updatedBy = userId;
    this.props.updatedAt = new Date();
  }

  moveTo(newFolderId: string | null, userId: string): void {
    this.props.folderId = newFolderId;
    this.props.updatedBy = userId;
    this.props.updatedAt = new Date();
  }

  softDelete(userId: string): void {
    this.props.status = DocumentStatus.DELETED;
    this.props.updatedBy = userId;
    this.props.updatedAt = new Date();
    this.props.deletedAt = new Date();
  }

  belongsToOrganization(organizationId: string): boolean {
    return this.props.organizationId === organizationId;
  }

  get id(): string {
    return this.props.id;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get repositoryType(): RepositoryType {
    return this.props.repositoryType;
  }
  get folderId(): string | null {
    return this.props.folderId;
  }
  get storageLocation(): StorageLocation {
    return this.props.storageLocation;
  }
  get metadata(): FileMetadata {
    return this.props.metadata;
  }
  get title(): string {
    return this.props.title;
  }
  get visibility(): Visibility {
    return this.props.visibility;
  }
  get status(): DocumentStatus {
    return this.props.status;
  }
  get isActive(): boolean {
    return this.props.status.isActive();
  }

  toProps(): DocumentProps {
    return { ...this.props };
  }
}
