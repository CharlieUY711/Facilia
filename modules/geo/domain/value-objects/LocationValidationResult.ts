import { InvalidLocationValidationResultError } from "../errors/GeoErrors";

export type LocationValidationResultValue = "VALIDATED" | "PARTIAL" | "FAILED" | "PENDING";

const VALID_VALUES: LocationValidationResultValue[] = ["VALIDATED", "PARTIAL", "FAILED", "PENDING"];

export class LocationValidationResult {
  private constructor(private readonly value: LocationValidationResultValue) {}

  static pending(): LocationValidationResult {
    return new LocationValidationResult("PENDING");
  }

  static fromString(value: string): LocationValidationResult {
    if (!VALID_VALUES.includes(value as LocationValidationResultValue)) {
      throw new InvalidLocationValidationResultError(value);
    }
    return new LocationValidationResult(value as LocationValidationResultValue);
  }

  isFinal(): boolean {
    return this.value !== "PENDING";
  }

  toString(): LocationValidationResultValue {
    return this.value;
  }
}
