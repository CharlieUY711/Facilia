import type { SupabaseClient } from "@supabase/supabase-js";
import { PresenceEvent } from "../../domain/entities/PresenceEvent";
import { PresenceEventFilters, PresenceEventRepository } from "../../domain/repositories/PresenceEventRepository";
import { PresenceEventMapper, GeoPresenceEventRow } from "../mappers/PresenceEventMapper";

const TABLE = "geo_presence_events";
const DEFAULT_PAGE_SIZE = 50;

export class SupabasePresenceEventRepository implements PresenceEventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(event: PresenceEvent): Promise<void> {
    const row = PresenceEventMapper.toRow(event);
    const { error } = await this.client.from(TABLE).insert(row);
    if (error) throw new Error(`Error al registrar evento de presencia: ${error.message}`);
  }

  async findById(id: string): Promise<PresenceEvent | null> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Error al buscar evento de presencia: ${error.message}`);
    return data ? PresenceEventMapper.toDomain(data as GeoPresenceEventRow) : null;
  }

  async findLastByPersonaAndGeofence(personaId: string, geofenceId: string): Promise<PresenceEvent | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("persona_id", personaId)
      .eq("geofence_id", geofenceId)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Error al buscar ultimo evento de presencia: ${error.message}`);
    return data ? PresenceEventMapper.toDomain(data as GeoPresenceEventRow) : null;
  }

  async findMany(filters: PresenceEventFilters): Promise<{ items: PresenceEvent[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("occurred_at", { ascending: false })
      .range(from, to);

    if (filters.personaId) query = query.eq("persona_id", filters.personaId);
    if (filters.geofenceId) query = query.eq("geofence_id", filters.geofenceId);
    if (filters.trackingSessionId) query = query.eq("tracking_session_id", filters.trackingSessionId);
    if (filters.from) query = query.gte("occurred_at", filters.from.toISOString());
    if (filters.to) query = query.lte("occurred_at", filters.to.toISOString());

    const { data, error, count } = await query;
    if (error) throw new Error(`Error al listar eventos de presencia: ${error.message}`);
    return {
      items: (data ?? []).map((row) => PresenceEventMapper.toDomain(row as GeoPresenceEventRow)),
      total: count ?? 0,
    };
  }
}
