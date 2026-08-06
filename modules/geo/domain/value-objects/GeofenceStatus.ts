import { InvalidGeofenceStatusError } from "../errors/GeoErrors";

export type GeofenceStatusValue = "ACTIVE" | "INACTIVE";

const VALID_VALUES: GeofenceStatusValue[] = ["ACTIVE", "INACTIVE"];

export class GeofenceStatus {
  private constructor(private readonly value: GeofenceStatusValue) {}

  static active(): GeofenceStatus {
    return new GeofenceStatus("ACTIVE");
  }

  static fromString(value: string): GeofenceStatus {
    if (!VALID_VALUES.includes(value as GeofenceStatusValue)) {
      throw new InvalidGeofenceStatusError(value);
    }
    return new GeofenceStatus(value as GeofenceStatusValue);
  }

  isActive(): boolean {
    return this.value === "ACTIVE";
  }

  toString(): GeofenceStatusValue {
    return this.value;
  }
}
