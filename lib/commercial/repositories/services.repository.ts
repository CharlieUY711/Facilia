/**
 * Repository — commercial_services
 * ----------------------------------------------------------------
 * Acceso a datos puro: sin checks de permisos ni validación de input
 * (eso vive en services/ y permissions.ts respectivamente).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommercialService, CommercialServiceInsert, CommercialServiceUpdate } from "@/lib/comercial/types";

const TABLE = "commercial_services";

export async function listServices(
  client: SupabaseClient,
  opts: { onlyActive?: boolean; q?: string } = {}
): Promise<CommercialService[]> {
  let query = client.from(TABLE).select("*").order("name", { ascending: true });
  if (opts.onlyActive) query = query.eq("active", true);
  if (opts.q) query = query.ilike("name", `%${opts.q}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CommercialService[];
}

export async function getServiceById(client: SupabaseClient, id: string): Promise<CommercialService | null> {
  const { data, error } = await client.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as CommercialService | null;
}

export async function insertService(
  client: SupabaseClient,
  input: CommercialServiceInsert
): Promise<CommercialService> {
  const { data, error } = await client.from(TABLE).insert(input).select().single();
  if (error) throw error;
  return data as CommercialService;
}

export async function updateService(
  client: SupabaseClient,
  id: string,
  input: CommercialServiceUpdate
): Promise<CommercialService> {
  const { data, error } = await client
    .from(TABLE)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CommercialService;
}

export async function setServiceActive(
  client: SupabaseClient,
  id: string,
  active: boolean
): Promise<CommercialService> {
  const { data, error } = await client
    .from(TABLE)
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CommercialService;
}
