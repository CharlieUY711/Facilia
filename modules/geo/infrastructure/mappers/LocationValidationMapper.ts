import { LocationValidation } from "../../domain/entities/LocationValidation";
import { LocationValidationResult } from "../../domain/value-objects/LocationValidationResult";
import { ExternalTaskReference, ExternalTaskType } from "../../domain/value-objects/ExternalTaskReference";
import { LocationValidationDTO } from "../../application/dto/GeoDTO";

export interface GeoLocationValidationRow {
  id: string;
  persona_id: string;
  geofence_id: string | null;
  task_type: string;
  task_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_arrival: string | null;
  actual_departure: string | null;
  result: string;
  time_difference_minutes: number | null;
  evaluated_at: string | null;
  created_at: string;
}

export class LocationValidationMapper {
  static toDomain(row: GeoLocationValidationRow): LocationValidation {
    return LocationValidation.reconstitute({
      id: row.id,
      personaId: row.persona_id,
      geofenceId: row.geofence_id,
      taskReference: ExternalTaskReference.create({
        taskType: row.task_type as ExternalTaskType,
        taskId: row.task_id,
      }),
      scheduledStart: row.scheduled_start ? new Date(row.scheduled_start) : null,
      scheduledEnd: row.scheduled_end ? new Date(row.scheduled_end) : null,
      actualArrival: row.actual_arrival ? new Date(row.actual_arrival) : null,
      actualDeparture: row.actual_departure ? new Date(row.actual_departure) : null,
      result: LocationValidationResult.fromString(row.result),
      timeDifferenceMinutes: row.time_difference_minutes,
      evaluatedAt: row.evaluated_at ? new Date(row.evaluated_at) : null,
      createdAt: new Date(row.created_at),
    });
  }

  static toRow(validation: LocationValidation): Omit<GeoLocationValidationRow, "created_at"> {
    const props = validation.toProps();
    return {
      id: props.id,
      persona_id: props.personaId,
      geofence_id: props.geofenceId,
      task_type: props.taskReference.taskType,
      task_id: props.taskReference.taskId,
      scheduled_start: props.scheduledStart ? props.scheduledStart.toISOString() : null,
      scheduled_end: props.scheduledEnd ? props.scheduledEnd.toISOString() : null,
      actual_arrival: props.actualArrival ? props.actualArrival.toISOString() : null,
      actual_departure: props.actualDeparture ? props.actualDeparture.toISOString() : null,
      result: props.result.toString(),
      time_difference_minutes: props.timeDifferenceMinutes,
      evaluated_at: props.evaluatedAt ? props.evaluatedAt.toISOString() : null,
    };
  }

  static toDTO(validation: LocationValidation): LocationValidationDTO {
    const props = validation.toProps();
    return {
      id: props.id,
      personaId: props.personaId,
      geofenceId: props.geofenceId,
      taskType: props.taskReference.taskType,
      taskId: props.taskReference.taskId,
      scheduledStart: props.scheduledStart ? props.scheduledStart.toISOString() : null,
      scheduledEnd: props.scheduledEnd ? props.scheduledEnd.toISOString() : null,
      actualArrival: props.actualArrival ? props.actualArrival.toISOString() : null,
      actualDeparture: props.actualDeparture ? props.actualDeparture.toISOString() : null,
      result: props.result.toString(),
      timeDifferenceMinutes: props.timeDifferenceMinutes,
    };
  }
}
