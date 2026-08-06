import { InvalidGeofenceTypeError } from "../errors/GeoErrors";

export type GeofenceTypeValue = "CLIENT_LOCATION" | "OFFICE" | "WAREHOUSE" | "CUSTOM";

const VALID_VALUES: GeofenceTypeValue[] = ["CLIENT_LOCATION", "OFFICE", "WAREHOUSE", "CUSTOM"];

export class GeofenceType {
  private constructor(private readonly value: GeofenceTypeValue) {}

  static fromString(value: string): GeofenceType {
    if (!VALID_VALUES.includes(value as GeofenceTypeValue)) {
      throw new InvalidGeofenceTypeError(value);
    }
    return new GeofenceType(value as GeofenceTypeValue);
  }

  /** CLIENT_LOCATION y OFFICE/WAREHOUSE (cuando modeladas como sede) pueden traer external_location_id. */
  isClientLocation(): boolean {
    return this.value === "CLIENT_LOCATION";
  }

  equals(other: GeofenceType): boolean {
    return this.value === other.value;
  }

  toString(): GeofenceTypeValue {
    return this.value;
  }
}
