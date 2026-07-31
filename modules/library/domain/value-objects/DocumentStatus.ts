export type DocumentStatusValue = "ACTIVE" | "DELETED";

export class DocumentStatus {
  private constructor(private readonly value: DocumentStatusValue) {}

  static ACTIVE = new DocumentStatus("ACTIVE");
  static DELETED = new DocumentStatus("DELETED");

  static fromString(value: string): DocumentStatus {
    if (value !== "ACTIVE" && value !== "DELETED") {
      throw new Error(`Estado invalido: ${value}`);
    }
    return value === "ACTIVE" ? DocumentStatus.ACTIVE : DocumentStatus.DELETED;
  }

  isActive(): boolean {
    return this.value === "ACTIVE";
  }

  toString(): DocumentStatusValue {
    return this.value;
  }
}
