import { LocationRecord } from "../../domain/entities/LocationRecord";
import { Coordinates } from "../../domain/value-objects/Coordinates";
import { LocationAccuracy } from "../../domain/value-objects/LocationAccuracy";
import { LocationRecordDTO } from "../../application/dto/GeoDTO";

export interface GeoLocationRecordRow {
  id: string;
  tracking_session_id: string;
  device_id: string;
  persona_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  recorded_at: string;
  created_at: string;
}

export class LocationRecordMapper {
  static toDomain(row: GeoLocationRecordRow): LocationRecord {
    return LocationRecord.reconstitute({
      id: row.id,
      trackingSessionId: row.tracking_session_id,
      deviceId: row.device_id,
      personaId: row.persona_id,
      coordinates: Coordinates.create({ latitude: row.latitude, longitude: row.longitude }),
      accuracy: LocationAccuracy.create(row.accuracy),
      altitude: row.altitude,
      speed: row.speed,
      recordedAt: new Date(row.recorded_at),
      createdAt: new Date(row.created_at),
    });
  }

  static toRow(record: LocationRecord): Omit<GeoLocationRecordRow, "created_at"> {
    const props = record.toProps();
    return {
      id: props.id,
      tracking_session_id: props.trackingSessionId,
      device_id: props.deviceId,
      persona_id: props.personaId,
      latitude: props.coordinates.latitude,
      longitude: props.coordinates.longitude,
      accuracy: props.accuracy.meters,
      altitude: props.altitude,
      speed: props.speed,
      recorded_at: props.recordedAt.toISOString(),
    };
  }

  static toDTO(record: LocationRecord): LocationRecordDTO {
    const props = record.toProps();
    return {
      id: props.id,
      trackingSessionId: props.trackingSessionId,
      deviceId: props.deviceId,
      personaId: props.personaId,
      latitude: props.coordinates.latitude,
      longitude: props.coordinates.longitude,
      accuracy: props.accuracy.meters,
      altitude: props.altitude,
      speed: props.speed,
      recordedAt: props.recordedAt.toISOString(),
    };
  }
}
