import { PresenceEvent } from "../../domain/entities/PresenceEvent";
import { PresenceEventType } from "../../domain/value-objects/PresenceEventType";
import { PresenceEventDTO } from "../../application/dto/GeoDTO";

export interface GeoPresenceEventRow {
  id: string;
  persona_id: string;
  device_id: string;
  geofence_id: string;
  tracking_session_id: string;
  location_record_id: string | null;
  event_type: string;
  occurred_at: string;
  created_at: string;
}

export class PresenceEventMapper {
  static toDomain(row: GeoPresenceEventRow): PresenceEvent {
    return PresenceEvent.reconstitute({
      id: row.id,
      personaId: row.persona_id,
      deviceId: row.device_id,
      geofenceId: row.geofence_id,
      trackingSessionId: row.tracking_session_id,
      locationRecordId: row.location_record_id,
      type: PresenceEventType.fromString(row.event_type),
      occurredAt: new Date(row.occurred_at),
      createdAt: new Date(row.created_at),
    });
  }

  static toRow(event: PresenceEvent): Omit<GeoPresenceEventRow, "created_at"> {
    const props = event.toProps();
    return {
      id: props.id,
      persona_id: props.personaId,
      device_id: props.deviceId,
      geofence_id: props.geofenceId,
      tracking_session_id: props.trackingSessionId,
      location_record_id: props.locationRecordId,
      event_type: props.type.toString(),
      occurred_at: props.occurredAt.toISOString(),
    };
  }

  static toDTO(event: PresenceEvent): PresenceEventDTO {
    const props = event.toProps();
    return {
      id: props.id,
      personaId: props.personaId,
      deviceId: props.deviceId,
      geofenceId: props.geofenceId,
      trackingSessionId: props.trackingSessionId,
      type: props.type.toString(),
      occurredAt: props.occurredAt.toISOString(),
    };
  }
}
