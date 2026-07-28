/**
 * Repository — internal_costs
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InternalCost, InternalCostInsert, InternalCostUpdate } from "@/lib/comercial/types";

const TABLE = "internal_costs";

export async function listInternalCosts(
  client: SupabaseClient,
  opts: { serviceId?: string; extraId?: string; onlyActive?: boolean; q?: string } = {}
): Promise<(InternalCost & { commercial_services: { name: string } | null })[]> {
  let query = client
    .from(TABLE)
    .select("*, commercial_services(name)")
    .order("valid_from", { ascending: false });

  if (opts.serviceId) query = query.eq("service_id", opts.serviceId);
  if (opts.extraId) query = query.eq("extra_id", opts.extraId);
  if (opts.onlyActive) query = query.eq("active", true);
  if (opts.q) query = query.ilike("concept", `%${opts.q}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as (InternalCost & { commercial_services: { name: string } | null })[];
}

export async function insertInternalCost(client: SupabaseClient, input: InternalCostInsert): Promise<InternalCost> {
  const { data, error } = await client.from(TABLE).insert(input).select().single();
  if (error) throw error;
  return data as InternalCost;
}

export async function updateInternalCost(
  client: SupabaseClient,
  id: string,
  input: InternalCostUpdate
): Promise<InternalCost> {
  const { data, error } = await client
    .from(TABLE)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as InternalCost;
}

export async function setInternalCostActive(
  client: SupabaseClient,
  id: string,
  active: boolean
): Promise<InternalCost> {
  const { data, error } = await client
    .from(TABLE)
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as InternalCost;
}
