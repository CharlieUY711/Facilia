import { LocationRecord } from "../entities/LocationRecord";

export interface LocationHistoryFilters {
  personaId?: string;
  deviceId?: string;
  trackingSessionId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface LocationRepository {
  save(record: LocationRecord): Promise<void>;
  /** Ingesta agrupada (GEO-04: sincronizacion de cola offline). */
  saveMany(records: LocationRecord[]): Promise<void>;
  /** Busqueda puntual por clave primaria (index escaneable en O(1) aun con alto volumen). */
  findById(id: string): Promise<LocationRecord | null>;
  findLastByPersonaId(personaId: string): Promise<LocationRecord | null>;
  findLastByDeviceId(deviceId: string): Promise<LocationRecord | null>;
  findByTrackingSession(
    trackingSessionId: string,
    range?: { from?: Date; to?: Date }
  ): Promise<LocationRecord[]>;
  findHistory(filters: LocationHistoryFilters): Promise<{ items: LocationRecord[]; total: number }>;
}
