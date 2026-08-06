import { Geofence } from "../../domain/entities/Geofence";
import { Coordinates } from "../../domain/value-objects/Coordinates";
import { GeoRadius } from "../../domain/value-objects/GeoRadius";
import { GeofenceType } from "../../domain/value-objects/GeofenceType";
import { GeofenceStatus } from "../../domain/value-objects/GeofenceStatus";
import { GeofenceDTO } from "../../application/dto/GeoDTO";

export interface GeoGeofenceRow {
  id: string;
  name: string;
  type: string;
  external_location_id: string | null;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export class GeofenceMapper {
  static toDomain(row: GeoGeofenceRow): Geofence {
    return Geofence.reconstitute({
      id: row.id,
      name: row.name,
      type: GeofenceType.fromString(row.type),
      externalLocationId: row.external_location_id,
      center: Coordinates.create({ latitude: row.center_latitude, longitude: row.center_longitude }),
      radius: GeoRadius.create(row.radius_meters),
      status: GeofenceStatus.fromString(row.status),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  static toRow(geofence: Geofence): Omit<GeoGeofenceRow, "created_at" | "updated_at"> {
    const props = geofence.toProps();
    return {
      id: props.id,
      name: props.name,
      type: props.type.toString(),
      external_location_id: props.externalLocationId,
      center_latitude: props.center.latitude,
      center_longitude: props.center.longitude,
      radius_meters: props.radius.meters,
      status: props.status.toString(),
      created_by: props.createdBy,
      updated_by: props.updatedBy,
    };
  }

  static toDTO(geofence: Geofence): GeofenceDTO {
    const props = geofence.toProps();
    return {
      id: props.id,
      name: props.name,
      type: props.type.toString(),
      externalLocationId: props.externalLocationId,
      latitude: props.center.latitude,
      longitude: props.center.longitude,
      radiusMeters: props.radius.meters,
      status: props.status.toString(),
    };
  }
}
