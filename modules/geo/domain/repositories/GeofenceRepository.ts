import { Geofence } from "../entities/Geofence";

export interface GeofenceFilters {
  type?: string;
  status?: string;
  externalLocationId?: string;
  page?: number;
  pageSize?: number;
}

export interface GeofenceRepository {
  save(geofence: Geofence): Promise<void>;
  findById(id: string): Promise<Geofence | null>;
  findByExternalLocationId(externalLocationId: string): Promise<Geofence[]>;
  /** Usado por el motor (GEO-05) para evaluar una posicion contra todas las geocercas activas. */
  findAllActive(): Promise<Geofence[]>;
  findMany(filters: GeofenceFilters): Promise<{ items: Geofence[]; total: number }>;
}
