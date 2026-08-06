import { InvalidTrackingSessionStatusError } from "../errors/GeoErrors";

export type TrackingSessionStatusValue = "ACTIVE" | "PAUSED" | "ENDED" | "CANCELLED";

const VALID_VALUES: TrackingSessionStatusValue[] = ["ACTIVE", "PAUSED", "ENDED", "CANCELLED"];

export class TrackingSessionStatus {
  private constructor(private readonly value: TrackingSessionStatusValue) {}

  static active(): TrackingSessionStatus {
    return new TrackingSessionStatus("ACTIVE");
  }

  static fromString(value: string): TrackingSessionStatus {
    if (!VALID_VALUES.includes(value as TrackingSessionStatusValue)) {
      throw new InvalidTrackingSessionStatusError(value);
    }
    return new TrackingSessionStatus(value as TrackingSessionStatusValue);
  }

  isActive(): boolean {
    return this.value === "ACTIVE";
  }

  isFinal(): boolean {
    return this.value === "ENDED" || this.value === "CANCELLED";
  }

  equals(other: TrackingSessionStatus): boolean {
    return this.value === other.value;
  }

  toString(): TrackingSessionStatusValue {
    return this.value;
  }
}
