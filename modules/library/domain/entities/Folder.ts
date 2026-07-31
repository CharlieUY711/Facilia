import { RepositoryType } from "../value-objects/RepositoryType";

export interface FolderProps {
  id: string;
  organizationId: string;
  repositoryType: RepositoryType;
  parentFolderId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Folder {
  private constructor(private props: FolderProps) {}

  static create(props: {
    id: string;
    organizationId: string;
    repositoryType: RepositoryType;
    parentFolderId: string | null;
    name: string;
    description?: string | null;
    createdBy: string;
  }): Folder {
    const name = props.name?.trim();
    if (!name) {
      throw new Error("El nombre de la carpeta es requerido");
    }
    const now = new Date();
    return new Folder({
      id: props.id,
      organizationId: props.organizationId,
      repositoryType: props.repositoryType,
      parentFolderId: props.parentFolderId,
      name,
      description: props.description ?? null,
      sortOrder: 0,
      createdBy: props.createdBy,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static reconstitute(props: FolderProps): Folder {
    return new Folder(props);
  }

  rename(newName: string, userId: string): void {
    const trimmed = newName?.trim();
    if (!trimmed) {
      throw new Error("El nuevo nombre de la carpeta es requerido");
    }
    this.props.name = trimmed;
    this.props.updatedBy = userId;
    this.props.updatedAt = new Date();
  }

  moveTo(newParentFolderId: string | null, userId: string): void {
    if (newParentFolderId === this.props.id) {
      throw new Error("Una carpeta no puede ser su propia carpeta padre");
    }
    this.props.parentFolderId = newParentFolderId;
    this.props.updatedBy = userId;
    this.props.updatedAt = new Date();
  }

  markDeleted(): void {
    this.props.deletedAt = new Date();
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
  get parentFolderId(): string | null {
    return this.props.parentFolderId;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string | null {
    return this.props.description;
  }
  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  toProps(): FolderProps {
    return { ...this.props };
  }
}
