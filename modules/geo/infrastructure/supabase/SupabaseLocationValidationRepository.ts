import type { SupabaseClient } from "@supabase/supabase-js";
import { LocationValidation } from "../../domain/entities/LocationValidation";
import {
  LocationValidationFilters,
  LocationValidationRepository,
} from "../../domain/repositories/LocationValidationRepository";
import { ExternalTaskType } from "../../domain/value-objects/ExternalTaskReference";
import { LocationValidationMapper, GeoLocationValidationRow } from "../mappers/LocationValidationMapper";

const TABLE = "geo_location_validations";
const DEFAULT_PAGE_SIZE = 25;

export class SupabaseLocationValidationRepository implements LocationValidationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(validation: LocationValidation): Promise<void> {
    const row = LocationValidationMapper.toRow(validation);
    const { error } = await this.client.from(TABLE).upsert(row, { onConflict: "id" });
    if (error) throw new Error(`Error al guardar validacion: ${error.message}`);
  }

  async findById(id: string): Promise<LocationValidation | null> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Error al buscar validacion: ${error.message}`);
    return data ? LocationValidationMapper.toDomain(data as GeoLocationValidationRow) : null;
  }

  async findByTaskReference(taskType: ExternalTaskType, taskId: string): Promise<LocationValidation[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("task_type", taskType)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Error al buscar validaciones por tarea: ${error.message}`);
    return (data ?? []).map((row) => LocationValidationMapper.toDomain(row as GeoLocationValidationRow));
  }

  async findMany(filters: LocationValidationFilters): Promise<{ items: LocationValidation[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.personaId) query = query.eq("persona_id", filters.personaId);
    if (filters.result) query = query.eq("result", filters.result);
    if (filters.from) query = query.gte("created_at", filters.from.toISOString());
    if (filters.to) query = query.lte("created_at", filters.to.toISOString());

    const { data, error, count } = await query;
    if (error) throw new Error(`Error al listar validaciones: ${error.message}`);
    return {
      items: (data ?? []).map((row) => LocationValidationMapper.toDomain(row as GeoLocationValidationRow)),
      total: count ?? 0,
    };
  }
}
