import type { SupabaseClient } from "@supabase/supabase-js";
import { Geofence } from "../../domain/entities/Geofence";
import { GeofenceFilters, GeofenceRepository } from "../../domain/repositories/GeofenceRepository";
import { GeofenceMapper, GeoGeofenceRow } from "../mappers/GeofenceMapper";

const TABLE = "geo_geofences";
const DEFAULT_PAGE_SIZE = 25;

export class SupabaseGeofenceRepository implements GeofenceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(geofence: Geofence): Promise<void> {
    const row = GeofenceMapper.toRow(geofence);
    const { error } = await this.client.from(TABLE).upsert(row, { onConflict: "id" });
    if (error) throw new Error(`Error al guardar geocerca: ${error.message}`);
  }

  async findById(id: string): Promise<Geofence | null> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Error al buscar geocerca: ${error.message}`);
    return data ? GeofenceMapper.toDomain(data as GeoGeofenceRow) : null;
  }

  async findByExternalLocationId(externalLocationId: string): Promise<Geofence[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("external_location_id", externalLocationId);
    if (error) throw new Error(`Error al buscar geocercas de la locacion: ${error.message}`);
    return (data ?? []).map((row) => GeofenceMapper.toDomain(row as GeoGeofenceRow));
  }

  async findAllActive(): Promise<Geofence[]> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("status", "ACTIVE");
    if (error) throw new Error(`Error al listar geocercas activas: ${error.message}`);
    return (data ?? []).map((row) => GeofenceMapper.toDomain(row as GeoGeofenceRow));
  }

  async findMany(filters: GeofenceFilters): Promise<{ items: Geofence[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client.from(TABLE).select("*", { count: "exact" }).order("name", { ascending: true }).range(from, to);
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.externalLocationId) query = query.eq("external_location_id", filters.externalLocationId);

    const { data, error, count } = await query;
    if (error) throw new Error(`Error al listar geocercas: ${error.message}`);
    return { items: (data ?? []).map((row) => GeofenceMapper.toDomain(row as GeoGeofenceRow)), total: count ?? 0 };
  }
}
