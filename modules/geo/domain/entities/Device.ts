import { DeviceStatus } from "../value-objects/DeviceStatus";
import { DeviceNotUsableError } from "../errors/GeoErrors";

export interface DeviceProps {
  id: string;
  personaId: string;
  deviceIdentifier: string;
  label: string | null;
  modelo: string | null;
  sistemaOperativo: string | null;
  navegador: string | null;
  appVersion: string | null;
  status: DeviceStatus;
  lastConnectionAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dispositivo movil corporativo. Se asocia siempre a una `persona_id` de
 * `public.personas` (no a un "usuario" abstracto ni a una organizacion:
 * ver GEO-00 S3-S4). El dominio no valida que la persona sea trackeable
 * (tipo personal_facilia, con acceso, activa) — esa regla cruza con
 * Directorio y vive en el caso de aplicacion (GEO-02/03).
 */
export class Device {
  private constructor(private props: DeviceProps) {}

  static create(props: {
    id: string;
    personaId: string;
    deviceIdentifier: string;
    label?: string | null;
    modelo?: string | null;
    sistemaOperativo?: string | null;
    navegador?: string | null;
    appVersion?: string | null;
    createdBy: string | null;
  }): Device {
    const now = new Date();
    return new Device({
      id: props.id,
      personaId: props.personaId,
      deviceIdentifier: props.deviceIdentifier,
      label: props.label ?? null,
      modelo: props.modelo ?? null,
      sistemaOperativo: props.sistemaOperativo ?? null,
      navegador: props.navegador ?? null,
      appVersion: props.appVersion ?? null,
      status: DeviceStatus.active(),
      lastConnectionAt: null,
      createdBy: props.createdBy,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: DeviceProps): Device {
    return new Device(props);
  }

  updateStatus(status: DeviceStatus, userId: string): void {
    this.props.status = status;
    this.props.updatedBy = userId;
    this.props.updatedAt = new Date();
  }

  reassignTo(personaId: string, userId: string): void {
    this.props.personaId = personaId;
    this.props.updatedBy = userId;
    this.props.updatedAt = new Date();
  }

  registerConnection(at: Date = new Date()): void {
    this.props.lastConnectionAt = at;
    this.props.updatedAt = new Date();
  }

  /** Se usa antes de permitir iniciar una TrackingSession (GEO-02/03). */
  assertUsable(): void {
    if (!this.props.status.isUsable()) {
      throw new DeviceNotUsableError(this.props.id, this.props.status.toString());
    }
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
  get deviceIdentifier(): string {
    return this.props.deviceIdentifier;
  }
  get status(): DeviceStatus {
    return this.props.status;
  }
  get lastConnectionAt(): Date | null {
    return this.props.lastConnectionAt;
  }

  toProps(): DeviceProps {
    return { ...this.props };
  }
}
