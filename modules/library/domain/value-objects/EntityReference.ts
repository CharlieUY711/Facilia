export interface EntityReferenceProps {
  entityType: string;
  entityId: string;
}

export class EntityReference {
  private constructor(
    public readonly entityType: string,
    public readonly entityId: string
  ) {}

  static create(props: EntityReferenceProps): EntityReference {
    if (!props.entityType?.trim()) {
      throw new Error("entityType es requerido");
    }
    if (!props.entityId?.trim()) {
      throw new Error("entityId es requerido");
    }
    return new EntityReference(props.entityType.trim().toUpperCase(), props.entityId.trim());
  }
}
