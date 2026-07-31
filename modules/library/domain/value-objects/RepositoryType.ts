import { InvalidRepositoryTypeError } from "../errors/LibraryErrors";

export const REPOSITORY_TYPES = ["PUBLIC", "PRIVATE"] as const;
export type RepositoryTypeValue = (typeof REPOSITORY_TYPES)[number];

export class RepositoryType {
  private constructor(private readonly value: RepositoryTypeValue) {}

  static PUBLIC = new RepositoryType("PUBLIC");
  static PRIVATE = new RepositoryType("PRIVATE");

  static fromString(value: string): RepositoryType {
    if (!REPOSITORY_TYPES.includes(value as RepositoryTypeValue)) {
      throw new InvalidRepositoryTypeError(value);
    }
    return value === "PUBLIC" ? RepositoryType.PUBLIC : RepositoryType.PRIVATE;
  }

  isPublic(): boolean {
    return this.value === "PUBLIC";
  }

  toString(): RepositoryTypeValue {
    return this.value;
  }

  equals(other: RepositoryType): boolean {
    return this.value === other.value;
  }
}
