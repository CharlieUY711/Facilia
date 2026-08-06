import { TrackingPeriod } from "../value-objects/TrackingPeriod";
import { TrackingSessionStatus } from "../value-objects/TrackingSessionStatus";
import { TrackingSessionNotActiveError } from "../errors/GeoErrors";

export interface TrackingSessionProps {
  id: string;
  personaId: string;
  deviceId: string;
  period: TrackingPeriod;
  status: TrackingSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sesion activa de seguimiento de una persona con un dispositivo
 * (equivalente a "jornada" en GEO-04). Se relaciona opcionalmente con una
 * tarea externa a traves de `ExternalTaskReference` en la capa de
 * aplicacion (GEO-03) — no se modela aqui para mantener el dominio de
 * tracking desacoplado de "para que" se trackea.
 */
export class TrackingSession {
  private constructor(private props: TrackingSessionProps) {}

  static start(props: { id: string; personaId: string; deviceId: string; startedAt?: Date }): TrackingSession {
    const now = new Date();
    return new TrackingSession({
      id: props.id,
      personaId: props.personaId,
      deviceId: props.deviceId,
      period: TrackingPeriod.start(props.startedAt ?? now),
      status: TrackingSessionStatus.active(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: TrackingSessionProps): TrackingSession {
    return new TrackingSession(props);
  }

  end(endedAt: Date = new Date()): void {
    if (!this.props.status.isActive() && this.props.status.toString() !== "PAUSED") {
      throw new TrackingSessionNotActiveError(this.props.id);
    }
    this.props.period = this.props.period.close(endedAt);
    this.props.status = TrackingSessionStatus.fromString("ENDED");
    this.props.updatedAt = new Date();
  }

  pause(): void {
    if (!this.props.status.isActive()) {
      throw new TrackingSessionNotActiveError(this.props.id);
    }
    this.props.status = TrackingSessionStatus.fromString("PAUSED");
    this.props.updatedAt = new Date();
  }

  resume(): void {
    this.props.status = TrackingSessionStatus.active();
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    this.props.status = TrackingSessionStatus.fromString("CANCELLED");
    this.props.updatedAt = new Date();
  }

  belongsToPersona(personaId: string): boolean {
    return this.props.personaId === personaId;
  }

  get id(): string {
    return this.props.id;
  }
  get personaId(): string {
    return this.props.personaId;
  }
  get deviceId(): string {
    return this.props.deviceId;
  }
  get period(): TrackingPeriod {
    return this.props.period;
  }
  get status(): TrackingSessionStatus {
    return this.props.status;
  }

  toProps(): TrackingSessionProps {
    return { ...this.props };
  }
}
