import { Coordinates } from "../value-objects/Coordinates";
import { GeoRadius } from "../value-objects/GeoRadius";
import { GeofenceType } from "../value-objects/GeofenceType";
import { GeofenceStatus } from "../value-objects/GeofenceStatus";

export interface GeofenceProps {
  id: string;
  name: string;
  type: GeofenceType;
  externalLocationId: string | null;
  center: Coordinates;
  radius: GeoRadius;
  status: GeofenceStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Zona autorizada (cliente/oficina/deposito/custom). `externalLocationId`
 * referencia opcionalmente `public.locaciones.id` sin copiar sus datos
 * (nombre, direccion quedan en Directorio — ver GEO-00 S4). El calculo de
 * distancia real (Haversine) se hace en la capa de aplicacion/motor
 * (GEO-05); esta entidad solo decide si una distancia ya calculada cae
 * dentro del radio.
 */
export class Geofence {
  private constructor(private props: GeofenceProps) {}

  static create(props: {
    id: string;
    name: string;
    type: GeofenceType;
    externalLocationId?: string | null;
    center: Coordinates;
    radius: GeoRadius;
    createdBy: string | null;
  }): Geofence {
    const now = new Date();
    return new Geofence({
      id: props.id,
      name: props.name,
      type: props.type,
      externalLocationId: props.externalLocationId ?? null,
      center: props.center,
      radius: props.radius,
      status: GeofenceStatus.active(),
      createdBy: props.createdBy,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: GeofenceProps): Geofence {
    return new Geofence(props);
  }

  rename(name: string, userId: string): void {
    const trimmed = name?.trim();
    if (!trimmed) throw new Error("El nombre de la geocerca es requerido");
    this.props.name = trimmed;
    this.props.updatedBy = userId;
    this.props.updatedAt = new Date();
  }

  updateGeometry(center: Coordinates, radius: GeoRadius, userId: string): void {
    this.props.center = center;
    this.props.radius = radius;
    this.props.updatedBy = userId;
    this.props.updatedAt = new Date();
  }

  disable(userId: string): void {
    this.props.status = GeofenceStatus.fromString("INACTIVE");
    this.props.updatedBy = userId;
    this.props.updatedAt = new Date();
  }

  enable(userId: string): void {
    this.props.status = GeofenceStatus.active();
    this.props.updatedBy = userId;
    this.props.updatedAt = new Date();
  }

  /** Recibe una distancia ya calculada (Haversine, GEO-05) en metros. */
  isWithinRadius(distanceInMeters: number): boolean {
    return this.props.radius.contains(distanceInMeters);
  }

  get id(): string {
    return this.props.id;
  }
  get type(): GeofenceType {
    return this.props.type;
  }
  get center(): Coordinates {
    return this.props.center;
  }
  get radius(): GeoRadius {
    return this.props.radius;
  }
  get status(): GeofenceStatus {
    return this.props.status;
  }
  get externalLocationId(): string | null {
    return this.props.externalLocationId;
  }

  toProps(): GeofenceProps {
    return { ...this.props };
  }
}
