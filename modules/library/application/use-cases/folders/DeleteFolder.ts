import { FolderRepository } from "../../../domain/repositories/FolderRepository";
import { FolderNotFoundError, OrganizationMismatchError } from "../../../domain/errors/LibraryErrors";

export interface DeleteFolderInput {
  folderId: string;
  organizationId: string;
}

export class DeleteFolder {
  constructor(private readonly folderRepository: FolderRepository) {}

  async execute(input: DeleteFolderInput): Promise<void> {
    const folder = await this.folderRepository.findById(input.folderId);
    if (!folder) throw new FolderNotFoundError(input.folderId);
    if (folder.organizationId !== input.organizationId) throw new OrganizationMismatchError();

    await this.folderRepository.delete(input.folderId);
  }
}
