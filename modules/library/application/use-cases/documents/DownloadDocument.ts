import { DocumentRepository } from "../../../domain/repositories/DocumentRepository";
import { StorageRepository } from "../../../domain/repositories/StorageRepository";
import { DocumentNotFoundError, OrganizationMismatchError } from "../../../domain/errors/LibraryErrors";
import { SIGNED_URL_EXPIRATION_SECONDS } from "../../../infrastructure/constants/storage-buckets";

export interface DownloadDocumentInput {
  documentId: string;
  organizationId: string;
}

export class DownloadDocument {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly storageRepository: StorageRepository
  ) {}

  async execute(input: DownloadDocumentInput): Promise<{ url: string; fileName: string }> {
    const document = await this.documentRepository.findById(input.documentId);
    if (!document) throw new DocumentNotFoundError(input.documentId);

    const isPublicAndActive = document.repositoryType.isPublic() && document.isActive;
    if (!isPublicAndActive && !document.belongsToOrganization(input.organizationId)) {
      throw new OrganizationMismatchError();
    }

    const url = await this.storageRepository.getSignedDownloadUrl(
      document.storageLocation,
      SIGNED_URL_EXPIRATION_SECONDS
    );
    return { url, fileName: document.metadata.originalName };
  }
}
