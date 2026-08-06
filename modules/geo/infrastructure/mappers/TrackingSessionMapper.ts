import { TrackingSession } from "../../domain/entities/TrackingSession";
import { TrackingPeriod } from "../../domain/value-objects/TrackingPeriod";
import { TrackingSessionStatus } from "../../domain/value-objects/TrackingSessionStatus";
import { TrackingSessionDTO } from "../../application/dto/GeoDTO";

export interface GeoTrackingSessionRow {
  id: string;
  persona_id: string;
  device_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export class TrackingSessionMapper {
  static toDomain(row: GeoTrackingSessionRow): TrackingSession {
    return TrackingSession.reconstitute({
      id: row.id,
      personaId: row.persona_id,
      deviceId: row.device_id,
      period: TrackingPeriod.create(new Date(row.started_at), row.ended_at ? new Date(row.ended_at) : null),
      status: TrackingSessionStatus.fromString(row.status),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  static toRow(session: TrackingSession): Omit<GeoTrackingSessionRow, "created_at" | "updated_at"> {
    const props = session.toProps();
    return {
      id: props.id,
      persona_id: props.personaId,
      device_id: props.deviceId,
      started_at: props.period.startedAt.toISOString(),
      ended_at: props.period.endedAt ? props.period.endedAt.toISOString() : null,
      status: props.status.toString(),
    };
  }

  static toDTO(session: TrackingSession): TrackingSessionDTO {
    const props = session.toProps();
    return {
      id: props.id,
      personaId: props.personaId,
      deviceId: props.deviceId,
      startedAt: props.period.startedAt.toISOString(),
      endedAt: props.period.endedAt ? props.period.endedAt.toISOString() : null,
      status: props.status.toString(),
      durationMinutes: props.period.durationMinutes(),
    };
  }
}
