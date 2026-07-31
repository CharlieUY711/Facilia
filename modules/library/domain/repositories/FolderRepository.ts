import { Folder } from "../entities/Folder";
import { RepositoryType } from "../value-objects/RepositoryType";

export interface FolderRepository {
  save(folder: Folder): Promise<void>;
  findById(id: string): Promise<Folder | null>;
  findChildren(parentFolderId: string | null, organizationId: string, repositoryType: RepositoryType): Promise<Folder[]>;
  findTree(organizationId: string, repositoryType: RepositoryType): Promise<Folder[]>;
  delete(id: string): Promise<void>;
}
