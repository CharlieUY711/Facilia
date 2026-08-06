import type { SupabaseClient } from "@supabase/supabase-js";
import { TrackingSession } from "../../domain/entities/TrackingSession";
import { TrackingSessionFilters, TrackingSessionRepository } from "../../domain/repositories/TrackingSessionRepository";
import { TrackingSessionMapper, GeoTrackingSessionRow } from "../mappers/TrackingSessionMapper";

const TABLE = "geo_tracking_sessions";
const DEFAULT_PAGE_SIZE = 25;

export class SupabaseTrackingSessionRepository implements TrackingSessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(session: TrackingSession): Promise<void> {
    const row = TrackingSessionMapper.toRow(session);
    const { error } = await this.client.from(TABLE).upsert(row, { onConflict: "id" });
    if (error) throw new Error(`Error al guardar sesion de tracking: ${error.message}`);
  }

  async findById(id: string): Promise<TrackingSession | null> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Error al buscar sesion de tracking: ${error.message}`);
    return data ? TrackingSessionMapper.toDomain(data as GeoTrackingSessionRow) : null;
  }

  async findActiveByPersonaId(personaId: string): Promise<TrackingSession | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("persona_id", personaId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (error) throw new Error(`Error al buscar sesion activa: ${error.message}`);
    return data ? TrackingSessionMapper.toDomain(data as GeoTrackingSessionRow) : null;
  }

  async findActiveByDeviceId(deviceId: string): Promise<TrackingSession | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("device_id", deviceId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (error) throw new Error(`Error al buscar sesion activa: ${error.message}`);
    return data ? TrackingSessionMapper.toDomain(data as GeoTrackingSessionRow) : null;
  }

  async findMany(filters: TrackingSessionFilters): Promise<{ items: TrackingSession[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("started_at", { ascending: false })
      .range(from, to);

    if (filters.personaId) query = query.eq("persona_id", filters.personaId);
    if (filters.deviceId) query = query.eq("device_id", filters.deviceId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.from) query = query.gte("started_at", filters.from.toISOString());
    if (filters.to) query = query.lte("started_at", filters.to.toISOString());

    const { data, error, count } = await query;
    if (error) throw new Error(`Error al listar sesiones: ${error.message}`);
    return {
      items: (data ?? []).map((row) => TrackingSessionMapper.toDomain(row as GeoTrackingSessionRow)),
      total: count ?? 0,
    };
  }
}
