import { InvalidTrackingPeriodError } from "../errors/GeoErrors";

export class TrackingPeriod {
  private constructor(
    public readonly startedAt: Date,
    public readonly endedAt: Date | null
  ) {}

  static start(startedAt: Date = new Date()): TrackingPeriod {
    return new TrackingPeriod(startedAt, null);
  }

  static create(startedAt: Date, endedAt: Date | null): TrackingPeriod {
    if (endedAt && endedAt.getTime() < startedAt.getTime()) {
      throw new InvalidTrackingPeriodError("la fecha de fin no puede ser anterior al inicio");
    }
    return new TrackingPeriod(startedAt, endedAt);
  }

  close(endedAt: Date = new Date()): TrackingPeriod {
    if (endedAt.getTime() < this.startedAt.getTime()) {
      throw new InvalidTrackingPeriodError("la fecha de fin no puede ser anterior al inicio");
    }
    return new TrackingPeriod(this.startedAt, endedAt);
  }

  get isOpen(): boolean {
    return this.endedAt === null;
  }

  durationMinutes(referenceNow: Date = new Date()): number {
    const end = this.endedAt ?? referenceNow;
    return Math.max(0, Math.round((end.getTime() - this.startedAt.getTime()) / 60000));
  }
}
