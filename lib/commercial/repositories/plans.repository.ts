/**
 * Repository — commercial_plans y plan_services
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CommercialPlan,
  CommercialPlanInsert,
  PlanService,
  PlanServiceInsert,
} from "@/lib/comercial/types";

const PLANS_TABLE = "commercial_plans";
const PLAN_SERVICES_TABLE = "plan_services";

export async function listPlans(
  client: SupabaseClient,
  opts: { onlyActive?: boolean; q?: string } = {}
): Promise<CommercialPlan[]> {
  let query = client.from(PLANS_TABLE).select("*").order("name", { ascending: true });
  if (opts.onlyActive) query = query.eq("active", true);
  if (opts.q) query = query.ilike("name", `%${opts.q}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CommercialPlan[];
}

export async function getPlanById(client: SupabaseClient, id: string): Promise<CommercialPlan | null> {
  const { data, error } = await client.from(PLANS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as CommercialPlan | null;
}

export async function insertPlan(client: SupabaseClient, input: CommercialPlanInsert): Promise<CommercialPlan> {
  const { data, error } = await client.from(PLANS_TABLE).insert(input).select().single();
  if (error) throw error;
  return data as CommercialPlan;
}

export async function updatePlan(
  client: SupabaseClient,
  id: string,
  input: Partial<CommercialPlanInsert>
): Promise<CommercialPlan> {
  const { data, error } = await client
    .from(PLANS_TABLE)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CommercialPlan;
}

export async function setPlanActive(client: SupabaseClient, id: string, active: boolean): Promise<CommercialPlan> {
  const { data, error } = await client
    .from(PLANS_TABLE)
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CommercialPlan;
}

/**
 * Ítems de un plan, con el nombre del servicio/extra asociado para
 * mostrar directamente en la UI sin resolverlo aparte.
 */
export async function listPlanServices(
  client: SupabaseClient,
  planId: string
): Promise<(PlanService & { commercial_services: { name: string } | null })[]> {
  const { data, error } = await client
    .from(PLAN_SERVICES_TABLE)
    .select("*, commercial_services(name)")
    .eq("plan_id", planId);
  if (error) throw error;
  return (data ?? []) as (PlanService & { commercial_services: { name: string } | null })[];
}

export async function insertPlanService(client: SupabaseClient, input: PlanServiceInsert): Promise<PlanService> {
  const { data, error } = await client.from(PLAN_SERVICES_TABLE).insert(input).select().single();
  if (error) throw error;
  return data as PlanService;
}

export async function removePlanService(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from(PLAN_SERVICES_TABLE).delete().eq("id", id);
  if (error) throw error;
}
