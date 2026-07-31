export type VisibilityValue = "PUBLIC" | "PRIVATE";

export class Visibility {
  private constructor(private readonly value: VisibilityValue) {}

  static PUBLIC = new Visibility("PUBLIC");
  static PRIVATE = new Visibility("PRIVATE");

  static fromString(value: string): Visibility {
    if (value !== "PUBLIC" && value !== "PRIVATE") {
      throw new Error(`Visibilidad invalida: ${value}`);
    }
    return value === "PUBLIC" ? Visibility.PUBLIC : Visibility.PRIVATE;
  }

  isPublic(): boolean {
    return this.value === "PUBLIC";
  }

  toString(): VisibilityValue {
    return this.value;
  }
}
