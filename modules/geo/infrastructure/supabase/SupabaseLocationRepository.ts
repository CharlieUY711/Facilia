import type { SupabaseClient } from "@supabase/supabase-js";
import { LocationRecord } from "../../domain/entities/LocationRecord";
import { LocationHistoryFilters, LocationRepository } from "../../domain/repositories/LocationRepository";
import { LocationRecordMapper, GeoLocationRecordRow } from "../mappers/LocationRecordMapper";

const TABLE = "geo_location_records";
const DEFAULT_PAGE_SIZE = 50;

export class SupabaseLocationRepository implements LocationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(record: LocationRecord): Promise<void> {
    const row = LocationRecordMapper.toRow(record);
    const { error } = await this.client.from(TABLE).insert(row);
    if (error) throw new Error(`Error al registrar posicion: ${error.message}`);
  }

  async saveMany(records: LocationRecord[]): Promise<void> {
    if (records.length === 0) return;
    const rows = records.map((r) => LocationRecordMapper.toRow(r));
    const { error } = await this.client.from(TABLE).insert(rows);
    if (error) throw new Error(`Error al sincronizar posiciones: ${error.message}`);
  }

  async findById(id: string): Promise<LocationRecord | null> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Error al buscar posicion: ${error.message}`);
    return data ? LocationRecordMapper.toDomain(data as GeoLocationRecordRow) : null;
  }

  async findLastByPersonaId(personaId: string): Promise<LocationRecord | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("persona_id", personaId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Error al buscar ultima posicion: ${error.message}`);
    return data ? LocationRecordMapper.toDomain(data as GeoLocationRecordRow) : null;
  }

  async findLastByDeviceId(deviceId: string): Promise<LocationRecord | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("device_id", deviceId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Error al buscar ultima posicion: ${error.message}`);
    return data ? LocationRecordMapper.toDomain(data as GeoLocationRecordRow) : null;
  }

  async findByTrackingSession(
    trackingSessionId: string,
    range?: { from?: Date; to?: Date }
  ): Promise<LocationRecord[]> {
    let query = this.client
      .from(TABLE)
      .select("*")
      .eq("tracking_session_id", trackingSessionId)
      .order("recorded_at", { ascending: true });
    if (range?.from) query = query.gte("recorded_at", range.from.toISOString());
    if (range?.to) query = query.lte("recorded_at", range.to.toISOString());

    const { data, error } = await query;
    if (error) throw new Error(`Error al listar posiciones de la sesion: ${error.message}`);
    return (data ?? []).map((row) => LocationRecordMapper.toDomain(row as GeoLocationRecordRow));
  }

  async findHistory(filters: LocationHistoryFilters): Promise<{ items: LocationRecord[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("recorded_at", { ascending: false })
      .range(from, to);

    if (filters.personaId) query = query.eq("persona_id", filters.personaId);
    if (filters.deviceId) query = query.eq("device_id", filters.deviceId);
    if (filters.trackingSessionId) query = query.eq("tracking_session_id", filters.trackingSessionId);
    if (filters.from) query = query.gte("recorded_at", filters.from.toISOString());
    if (filters.to) query = query.lte("recorded_at", filters.to.toISOString());

    const { data, error, count } = await query;
    if (error) throw new Error(`Error al listar historico de posiciones: ${error.message}`);
    return {
      items: (data ?? []).map((row) => LocationRecordMapper.toDomain(row as GeoLocationRecordRow)),
      total: count ?? 0,
    };
  }
}
