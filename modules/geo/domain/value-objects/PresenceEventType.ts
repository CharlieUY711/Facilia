import { InvalidPresenceEventTypeError } from "../errors/GeoErrors";

export type PresenceEventTypeValue = "ENTER" | "EXIT" | "STAY" | "UNKNOWN";

const VALID_VALUES: PresenceEventTypeValue[] = ["ENTER", "EXIT", "STAY", "UNKNOWN"];

export class PresenceEventType {
  private constructor(private readonly value: PresenceEventTypeValue) {}

  static fromString(value: string): PresenceEventType {
    if (!VALID_VALUES.includes(value as PresenceEventTypeValue)) {
      throw new InvalidPresenceEventTypeError(value);
    }
    return new PresenceEventType(value as PresenceEventTypeValue);
  }

  static enter(): PresenceEventType {
    return new PresenceEventType("ENTER");
  }

  static exit(): PresenceEventType {
    return new PresenceEventType("EXIT");
  }

  static stay(): PresenceEventType {
    return new PresenceEventType("STAY");
  }

  toString(): PresenceEventTypeValue {
    return this.value;
  }
}
