import { DocumentLinkRepository } from "../../../domain/repositories/DocumentLinkRepository";
import { EntityReference } from "../../../domain/value-objects/EntityReference";

export interface UnlinkDocumentInput {
  documentId: string;
  entityType: string;
  entityId: string;
}

export class UnlinkDocument {
  constructor(private readonly documentLinkRepository: DocumentLinkRepository) {}

  async execute(input: UnlinkDocumentInput): Promise<void> {
    const entityReference = EntityReference.create({
      entityType: input.entityType,
      entityId: input.entityId,
    });
    await this.documentLinkRepository.unlink(input.documentId, entityReference);
  }
}
