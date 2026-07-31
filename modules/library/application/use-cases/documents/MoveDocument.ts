import { DocumentRepository } from "../../../domain/repositories/DocumentRepository";
import { FolderRepository } from "../../../domain/repositories/FolderRepository";
import { DocumentNotFoundError, OrganizationMismatchError } from "../../../domain/errors/LibraryErrors";
import { DocumentMapper } from "../../../infrastructure/mappers/DocumentMapper";
import { DocumentDTO } from "../../dto/DocumentDTO";

export interface MoveDocumentInput {
  documentId: string;
  organizationId: string;
  newFolderId: string | null;
  userId: string;
}

export class MoveDocument {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly folderRepository: FolderRepository
  ) {}

  async execute(input: MoveDocumentInput): Promise<DocumentDTO> {
    const document = await this.documentRepository.findById(input.documentId);
    if (!document) throw new DocumentNotFoundError(input.documentId);
    if (!document.belongsToOrganization(input.organizationId)) throw new OrganizationMismatchError();

    if (input.newFolderId) {
      const folder = await this.folderRepository.findById(input.newFolderId);
      if (!folder) throw new Error("La carpeta destino no existe");
      if (folder.organizationId !== input.organizationId) throw new OrganizationMismatchError();
    }

    document.moveTo(input.newFolderId, input.userId);
    await this.documentRepository.save(document);
    return DocumentMapper.toDTO(document);
  }
}
