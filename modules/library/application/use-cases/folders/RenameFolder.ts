import { FolderRepository } from "../../../domain/repositories/FolderRepository";
import { FolderNotFoundError, OrganizationMismatchError } from "../../../domain/errors/LibraryErrors";
import { FolderMapper } from "../../../infrastructure/mappers/FolderMapper";
import { FolderDTO } from "../../dto/FolderDTO";

export interface RenameFolderInput {
  folderId: string;
  organizationId: string;
  newName: string;
  userId: string;
}

export class RenameFolder {
  constructor(private readonly folderRepository: FolderRepository) {}

  async execute(input: RenameFolderInput): Promise<FolderDTO> {
    const folder = await this.folderRepository.findById(input.folderId);
    if (!folder) throw new FolderNotFoundError(input.folderId);
    if (folder.organizationId !== input.organizationId) throw new OrganizationMismatchError();

    folder.rename(input.newName, input.userId);
    await this.folderRepository.save(folder);
    return FolderMapper.toDTO(folder);
  }
}
