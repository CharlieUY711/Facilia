import { DocumentReference } from "../entities/DocumentReference";
import { EntityReference } from "../value-objects/EntityReference";

export interface DocumentLinkRepository {
  link(reference: DocumentReference): Promise<void>;
  unlink(documentId: string, entityReference: EntityReference): Promise<void>;
  findByEntity(entityReference: EntityReference): Promise<DocumentReference[]>;
  findByDocument(documentId: string): Promise<DocumentReference[]>;
}
