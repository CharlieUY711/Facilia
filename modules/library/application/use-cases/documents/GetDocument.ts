import { DocumentRepository } from "../../../domain/repositories/DocumentRepository";
import { DocumentNotFoundError, OrganizationMismatchError } from "../../../domain/errors/LibraryErrors";
import { DocumentMapper } from "../../../infrastructure/mappers/DocumentMapper";
import { DocumentDTO } from "../../dto/DocumentDTO";

export interface GetDocumentInput {
  documentId: string;
  organizationId: string;
}

export class GetDocument {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(input: GetDocumentInput): Promise<DocumentDTO> {
    const document = await this.documentRepository.findById(input.documentId);
    if (!document) throw new DocumentNotFoundError(input.documentId);

    const isPublicAndActive = document.repositoryType.isPublic() && document.isActive;
    if (!isPublicAndActive && !document.belongsToOrganization(input.organizationId)) {
      throw new OrganizationMismatchError();
    }
    return DocumentMapper.toDTO(document);
  }
}
