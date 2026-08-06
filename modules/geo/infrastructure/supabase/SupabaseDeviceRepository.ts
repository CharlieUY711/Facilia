import type { SupabaseClient } from "@supabase/supabase-js";
import { Device } from "../../domain/entities/Device";
import { DeviceFilters, DeviceRepository } from "../../domain/repositories/DeviceRepository";
import { DeviceMapper, GeoDeviceRow } from "../mappers/DeviceMapper";

const TABLE = "geo_devices";
const DEFAULT_PAGE_SIZE = 25;

export class SupabaseDeviceRepository implements DeviceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(device: Device): Promise<void> {
    const row = DeviceMapper.toRow(device);
    const { error } = await this.client.from(TABLE).upsert(row, { onConflict: "id" });
    if (error) throw new Error(`Error al guardar dispositivo: ${error.message}`);
  }

  async findById(id: string): Promise<Device | null> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Error al buscar dispositivo: ${error.message}`);
    return data ? DeviceMapper.toDomain(data as GeoDeviceRow) : null;
  }

  async findByIdentifier(deviceIdentifier: string): Promise<Device | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("device_identifier", deviceIdentifier)
      .maybeSingle();
    if (error) throw new Error(`Error al buscar dispositivo: ${error.message}`);
    return data ? DeviceMapper.toDomain(data as GeoDeviceRow) : null;
  }

  async findByPersonaId(personaId: string): Promise<Device[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("persona_id", personaId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Error al listar dispositivos: ${error.message}`);
    return (data ?? []).map((row) => DeviceMapper.toDomain(row as GeoDeviceRow));
  }

  async findMany(filters: DeviceFilters): Promise<{ items: Device[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client.from(TABLE).select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (filters.personaId) query = query.eq("persona_id", filters.personaId);
    if (filters.status) query = query.eq("status", filters.status);

    const { data, error, count } = await query;
    if (error) throw new Error(`Error al listar dispositivos: ${error.message}`);
    return { items: (data ?? []).map((row) => DeviceMapper.toDomain(row as GeoDeviceRow)), total: count ?? 0 };
  }
}
