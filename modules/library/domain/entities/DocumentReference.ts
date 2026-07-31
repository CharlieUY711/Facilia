import { EntityReference } from "../value-objects/EntityReference";

export interface DocumentReferenceProps {
  id: string;
  documentId: string;
  entityReference: EntityReference;
  createdBy: string;
  createdAt: Date;
}

export class DocumentReference {
  private constructor(private props: DocumentReferenceProps) {}

  static create(props: {
    id: string;
    documentId: string;
    entityReference: EntityReference;
    createdBy: string;
  }): DocumentReference {
    return new DocumentReference({
      id: props.id,
      documentId: props.documentId,
      entityReference: props.entityReference,
      createdBy: props.createdBy,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: DocumentReferenceProps): DocumentReference {
    return new DocumentReference(props);
  }

  get id(): string {
    return this.props.id;
  }
  get documentId(): string {
    return this.props.documentId;
  }
  get entityReference(): EntityReference {
    return this.props.entityReference;
  }

  toProps(): DocumentReferenceProps {
    return { ...this.props };
  }
}
