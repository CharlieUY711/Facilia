import { FolderRepository } from "../../../domain/repositories/FolderRepository";
import { RepositoryType } from "../../../domain/value-objects/RepositoryType";
import { FolderMapper } from "../../../infrastructure/mappers/FolderMapper";
import { FolderDTO } from "../../dto/FolderDTO";

export interface ListFoldersInput {
  organizationId: string;
  repositoryType: string;
  parentFolderId?: string | null;
}

export class ListFolders {
  constructor(private readonly folderRepository: FolderRepository) {}

  async execute(input: ListFoldersInput): Promise<FolderDTO[]> {
    const repositoryType = RepositoryType.fromString(input.repositoryType);
    const folders =
      input.parentFolderId === undefined
        ? await this.folderRepository.findTree(input.organizationId, repositoryType)
        : await this.folderRepository.findChildren(input.parentFolderId, input.organizationId, repositoryType);

    return folders.map((f) => FolderMapper.toDTO(f));
  }
}
