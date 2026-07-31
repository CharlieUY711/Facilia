import { randomUUID } from "crypto";
import { DocumentRepository } from "../../../domain/repositories/DocumentRepository";
import { DocumentLinkRepository } from "../../../domain/repositories/DocumentLinkRepository";
import { DocumentReference } from "../../../domain/entities/DocumentReference";
import { EntityReference } from "../../../domain/value-objects/EntityReference";
import { DocumentNotFoundError, OrganizationMismatchError } from "../../../domain/errors/LibraryErrors";

export interface LinkDocumentInput {
  documentId: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  userId: string;
}

export class LinkDocument {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly documentLinkRepository: DocumentLinkRepository
  ) {}

  async execute(input: LinkDocumentInput): Promise<void> {
    const document = await this.documentRepository.findById(input.documentId);
    if (!document) throw new DocumentNotFoundError(input.documentId);
    if (!document.belongsToOrganization(input.organizationId)) throw new OrganizationMismatchError();

    const reference = DocumentReference.create({
      id: randomUUID(),
      documentId: input.documentId,
      entityReference: EntityReference.create({ entityType: input.entityType, entityId: input.entityId }),
      createdBy: input.userId,
    });

    await this.documentLinkRepository.link(reference);
  }
}
