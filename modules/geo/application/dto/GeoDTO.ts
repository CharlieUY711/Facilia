// DTOs de salida (forma serializable, usada por mappers en GEO-02 y por
// las respuestas de las API Routes). No dependen de las entidades de
// dominio para poder viajar libremente hacia presentation/tests.

export interface DeviceDTO {
  id: string;
  personaId: string;
  deviceIdentifier: string;
  label: string | null;
  modelo: string | null;
  sistemaOperativo: string | null;
  status: string;
  lastConnectionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingSessionDTO {
  id: string;
  personaId: string;
  deviceId: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  durationMinutes: number;
}

export interface LocationRecordDTO {
  id: string;
  trackingSessionId: string;
  deviceId: string;
  personaId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  recordedAt: string;
}

export interface GeofenceDTO {
  id: string;
  name: string;
  type: string;
  externalLocationId: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: string;
}

export interface PresenceEventDTO {
  id: string;
  personaId: string;
  deviceId: string;
  geofenceId: string;
  trackingSessionId: string;
  type: string;
  occurredAt: string;
}

export interface LocationValidationDTO {
  id: string;
  personaId: string;
  geofenceId: string | null;
  taskType: string;
  taskId: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  actualArrival: string | null;
  actualDeparture: string | null;
  result: string;
  timeDifferenceMinutes: number | null;
}
