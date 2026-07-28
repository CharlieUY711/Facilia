/**
 * Repository — commercial_prices
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommercialPrice, CommercialPriceInsert } from "@/lib/comercial/types";

const TABLE = "commercial_prices";

/**
 * Lista todas las tarifas (para la tabla de administración), con el
 * nombre del servicio asociado para mostrar en la UI. Soporta búsqueda
 * por nombre de servicio y filtro por estado activo/inactivo.
 */
export async function listAllPrices(
  client: SupabaseClient,
  opts: { onlyActive?: boolean; q?: string } = {}
): Promise<(CommercialPrice & { commercial_services: { name: string } | null })[]> {
  let query = client
    .from(TABLE)
    .select("*, commercial_services(name)")
    .order("valid_from", { ascending: false });

  if (opts.onlyActive) query = query.eq("active", true);
  if (opts.q) query = query.ilike("commercial_services.name", `%${opts.q}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as (CommercialPrice & { commercial_services: { name: string } | null })[];
}

export async function listPricesForService(
  client: SupabaseClient,
  serviceId: string
): Promise<CommercialPrice[]> {
  const { data, error } = await client
    .from(TABLE)
    .select("*")
    .eq("service_id", serviceId)
    .order("valid_from", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CommercialPrice[];
}

export async function listPricesForExtra(client: SupabaseClient, extraId: string): Promise<CommercialPrice[]> {
  const { data, error } = await client
    .from(TABLE)
    .select("*")
    .eq("extra_id", extraId)
    .order("valid_from", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CommercialPrice[];
}

/**
 * Precio vigente para un servicio/extra en una fecha dada (default: hoy).
 * "Vigente" = active = true, valid_from <= fecha, y (valid_to es null o >= fecha).
 */
export async function getCurrentPrice(
  client: SupabaseClient,
  target: { serviceId?: string; extraId?: string; segment?: string; date?: string }
): Promise<CommercialPrice | null> {
  const fecha = target.date ?? new Date().toISOString().slice(0, 10);

  let query = client
    .from(TABLE)
    .select("*")
    .eq("active", true)
    .lte("valid_from", fecha)
    .or(`valid_to.is.null,valid_to.gte.${fecha}`);

  if (target.serviceId) query = query.eq("service_id", target.serviceId);
  if (target.extraId) query = query.eq("extra_id", target.extraId);

  const { data, error } = await query.order("valid_from", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as CommercialPrice[];
  if (rows.length === 0) return null;

  if (target.segment) {
    const bySegment = rows.find((r) => r.segment === target.segment);
    if (bySegment) return bySegment;
  }
  return rows.find((r) => r.segment === null) ?? rows[0];
}

export async function insertPrice(client: SupabaseClient, input: CommercialPriceInsert): Promise<CommercialPrice> {
  const { data, error } = await client.from(TABLE).insert(input).select().single();
  if (error) throw error;
  return data as CommercialPrice;
}

export async function deactivatePrice(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client
    .from(TABLE)
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function setPriceActive(
  client: SupabaseClient,
  id: string,
  active: boolean
): Promise<CommercialPrice> {
  const { data, error } = await client
    .from(TABLE)
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CommercialPrice;
}
