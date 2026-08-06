// Contratos de casos de uso definidos en GEO-01 ("Casos de uso
// preparados: definir interfaces"). La implementacion concreta (orquestando
// los repositorios de dominio contra Supabase) se hace en GEO-02. Mantener
// estas interfaces separadas de la implementacion permite que GEO-02
// empiece sin ambiguedad sobre la forma esperada de entrada/salida.

import { DeviceDTO, GeofenceDTO, LocationRecordDTO, PresenceEventDTO, TrackingSessionDTO } from "../dto/GeoDTO";
import { ExternalTaskType } from "../../domain/value-objects/ExternalTaskReference";

// ── Device Management ──────────────────────────────────────────────

export interface RegisterDeviceInput {
  personaId: string;
  deviceIdentifier: string;
  label?: string | null;
  modelo?: string | null;
  sistemaOperativo?: string | null;
  navegador?: string | null;
  appVersion?: string | null;
  requestedBy: string; // profiles.id de quien ejecuta la accion
}
export interface RegisterDeviceUseCase {
  execute(input: RegisterDeviceInput): Promise<DeviceDTO>;
}

export interface UpdateDeviceStatusInput {
  deviceId: string;
  status: "ACTIVE" | "INACTIVE" | "LOST" | "BLOCKED" | "RETIRED";
  requestedBy: string;
}
export interface UpdateDeviceStatusUseCase {
  execute(input: UpdateDeviceStatusInput): Promise<DeviceDTO>;
}

// ── Tracking Sessions ───────────────────────────────────────────────

export interface StartTrackingSessionInput {
  personaId: string;
  deviceId: string;
}
export interface StartTrackingSessionUseCase {
  execute(input: StartTrackingSessionInput): Promise<TrackingSessionDTO>;
}

export interface EndTrackingSessionInput {
  trackingSessionId: string;
  personaId: string;
}
export interface EndTrackingSessionUseCase {
  execute(input: EndTrackingSessionInput): Promise<TrackingSessionDTO>;
}

// ── Location Capture ────────────────────────────────────────────────

export interface RecordLocationInput {
  trackingSessionId: string;
  deviceId: string;
  personaId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
  recordedAt: string; // ISO timestamp generado por el dispositivo (GEO-04)
}
export interface RecordLocationUseCase {
  execute(input: RecordLocationInput): Promise<LocationRecordDTO>;
}

// ── Geofences ───────────────────────────────────────────────────────

export interface CreateGeofenceInput {
  name: string;
  type: "CLIENT_LOCATION" | "OFFICE" | "WAREHOUSE" | "CUSTOM";
  externalLocationId?: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  requestedBy: string;
}
export interface CreateGeofenceUseCase {
  execute(input: CreateGeofenceInput): Promise<GeofenceDTO>;
}

export interface UpdateGeofenceInput {
  geofenceId: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  requestedBy: string;
}
export interface UpdateGeofenceUseCase {
  execute(input: UpdateGeofenceInput): Promise<GeofenceDTO>;
}

export interface SetGeofenceStatusInput {
  geofenceId: string;
  status: "ACTIVE" | "INACTIVE";
  requestedBy: string;
}
export interface SetGeofenceStatusUseCase {
  execute(input: SetGeofenceStatusInput): Promise<GeofenceDTO>;
}

// ── Presence Detection (motor, GEO-05) ─────────────────────────────

export interface DetectPresenceInput {
  locationRecordId: string;
}
export interface DetectPresenceUseCase {
  /** Evalua una posicion contra todas las geocercas activas y produce 0..N eventos. */
  execute(input: DetectPresenceInput): Promise<PresenceEventDTO[]>;
}

// ── Location Validation (cruce con tarea externa, GEO-03/05) ───────

export interface ValidateLocationInput {
  personaId: string;
  geofenceId: string | null;
  taskType: ExternalTaskType;
  taskId: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
}
export interface ValidateLocationUseCase {
  execute(input: ValidateLocationInput): Promise<{
    result: "VALIDATED" | "PARTIAL" | "FAILED" | "PENDING";
    timeDifferenceMinutes: number | null;
  }>;
}
