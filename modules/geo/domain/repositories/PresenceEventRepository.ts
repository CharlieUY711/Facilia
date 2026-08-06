import { PresenceEvent } from "../entities/PresenceEvent";

export interface PresenceEventFilters {
  personaId?: string;
  geofenceId?: string;
  trackingSessionId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface PresenceEventRepository {
  save(event: PresenceEvent): Promise<void>;
  findById(id: string): Promise<PresenceEvent | null>;
  /** Necesario para que el motor (GEO-05) sepa el ultimo estado (ENTER/EXIT/STAY) antes de decidir el proximo. */
  findLastByPersonaAndGeofence(personaId: string, geofenceId: string): Promise<PresenceEvent | null>;
  findMany(filters: PresenceEventFilters): Promise<{ items: PresenceEvent[]; total: number }>;
}
