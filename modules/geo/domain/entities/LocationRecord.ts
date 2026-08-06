import { Coordinates } from "../value-objects/Coordinates";
import { LocationAccuracy } from "../value-objects/LocationAccuracy";

export interface LocationRecordProps {
  id: string;
  trackingSessionId: string;
  deviceId: string;
  personaId: string;
  coordinates: Coordinates;
  accuracy: LocationAccuracy;
  altitude: number | null;
  speed: number | null;
  recordedAt: Date;
  createdAt: Date;
}

/**
 * Una posicion capturada por el dispositivo. Es, deliberadamente, una
 * entidad casi sin comportamiento: alto volumen esperado (GEO-00 S16.5,
 * GEO-01 performance), sin logica de negocio propia mas alla de exponer
 * sus valores para que el motor de geocercas (GEO-05) los use.
 */
export class LocationRecord {
  private constructor(private props: LocationRecordProps) {}

  static create(props: {
    id: string;
    trackingSessionId: string;
    deviceId: string;
    personaId: string;
    coordinates: Coordinates;
    accuracy: LocationAccuracy;
    altitude?: number | null;
    speed?: number | null;
    recordedAt: Date;
  }): LocationRecord {
    return new LocationRecord({
      id: props.id,
      trackingSessionId: props.trackingSessionId,
      deviceId: props.deviceId,
      personaId: props.personaId,
      coordinates: props.coordinates,
      accuracy: props.accuracy,
      altitude: props.altitude ?? null,
      speed: props.speed ?? null,
      recordedAt: props.recordedAt,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: LocationRecordProps): LocationRecord {
    return new LocationRecord(props);
  }

  get id(): string {
    return this.props.id;
  }
  get trackingSessionId(): string {
    return this.props.trackingSessionId;
  }
  get deviceId(): string {
    return this.props.deviceId;
  }
  get personaId(): string {
    return this.props.personaId;
  }
  get coordinates(): Coordinates {
    return this.props.coordinates;
  }
  get accuracy(): LocationAccuracy {
    return this.props.accuracy;
  }
  get recordedAt(): Date {
    return this.props.recordedAt;
  }

  toProps(): LocationRecordProps {
    return { ...this.props };
  }
}
