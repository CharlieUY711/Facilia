import { randomUUID } from "crypto";
import { Folder } from "../../../domain/entities/Folder";
import { FolderRepository } from "../../../domain/repositories/FolderRepository";
import { RepositoryType } from "../../../domain/value-objects/RepositoryType";
import { FolderMapper } from "../../../infrastructure/mappers/FolderMapper";
import { FolderDTO } from "../../dto/FolderDTO";

export interface CreateFolderInput {
  organizationId: string;
  repositoryType: string;
  parentFolderId: string | null;
  name: string;
  description?: string | null;
  userId: string;
}

export class CreateFolder {
  constructor(private readonly folderRepository: FolderRepository) {}

  async execute(input: CreateFolderInput): Promise<FolderDTO> {
    if (input.parentFolderId) {
      const parent = await this.folderRepository.findById(input.parentFolderId);
      if (!parent) throw new Error("La carpeta padre no existe");
      if (parent.organizationId !== input.organizationId) {
        throw new Error("La carpeta padre no pertenece a la organizacion");
      }
    }

    const folder = Folder.create({
      id: randomUUID(),
      organizationId: input.organizationId,
      repositoryType: RepositoryType.fromString(input.repositoryType),
      parentFolderId: input.parentFolderId,
      name: input.name,
      description: input.description,
      createdBy: input.userId,
    });

    await this.folderRepository.save(folder);
    return FolderMapper.toDTO(folder);
  }
}
