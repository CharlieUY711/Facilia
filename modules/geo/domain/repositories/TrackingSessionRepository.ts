import { TrackingSession } from "../entities/TrackingSession";

export interface TrackingSessionFilters {
  personaId?: string;
  deviceId?: string;
  status?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface TrackingSessionRepository {
  save(session: TrackingSession): Promise<void>;
  findById(id: string): Promise<TrackingSession | null>;
  /** Regla GEO-02: una persona no deberia tener mas de una sesion ACTIVE simultanea. */
  findActiveByPersonaId(personaId: string): Promise<TrackingSession | null>;
  findActiveByDeviceId(deviceId: string): Promise<TrackingSession | null>;
  findMany(filters: TrackingSessionFilters): Promise<{ items: TrackingSession[]; total: number }>;
}
