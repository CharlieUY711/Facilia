import { DocumentRepository } from "../../../domain/repositories/DocumentRepository";
import { DocumentNotFoundError, OrganizationMismatchError } from "../../../domain/errors/LibraryErrors";

export interface DeleteDocumentInput {
  documentId: string;
  organizationId: string;
  userId: string;
}

export class DeleteDocument {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(input: DeleteDocumentInput): Promise<void> {
    const document = await this.documentRepository.findById(input.documentId);
    if (!document) throw new DocumentNotFoundError(input.documentId);
    if (!document.belongsToOrganization(input.organizationId)) throw new OrganizationMismatchError();

    document.softDelete(input.userId);
    await this.documentRepository.save(document);
  }
}
