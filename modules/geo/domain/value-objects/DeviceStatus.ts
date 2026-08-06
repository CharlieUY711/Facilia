import { InvalidDeviceStatusError } from "../errors/GeoErrors";

export type DeviceStatusValue = "ACTIVE" | "INACTIVE" | "LOST" | "BLOCKED" | "RETIRED";

const VALID_VALUES: DeviceStatusValue[] = ["ACTIVE", "INACTIVE", "LOST", "BLOCKED", "RETIRED"];

export class DeviceStatus {
  private constructor(private readonly value: DeviceStatusValue) {}

  static active(): DeviceStatus {
    return new DeviceStatus("ACTIVE");
  }

  static fromString(value: string): DeviceStatus {
    if (!VALID_VALUES.includes(value as DeviceStatusValue)) {
      throw new InvalidDeviceStatusError(value);
    }
    return new DeviceStatus(value as DeviceStatusValue);
  }

  /** Un dispositivo solo puede iniciar/continuar tracking si esta ACTIVE. */
  isUsable(): boolean {
    return this.value === "ACTIVE";
  }

  equals(other: DeviceStatus): boolean {
    return this.value === other.value;
  }

  toString(): DeviceStatusValue {
    return this.value;
  }
}
