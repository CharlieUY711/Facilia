/**
 * Service — Planes comerciales (commercial_plans + plan_services)
 */

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminOSuperAdmin } from "@/lib/comercial/permissions";
import {
  createCommercialPlanSchema,
  updateCommercialPlanSchema,
  associateServiceToPlanSchema,
} from "@/lib/comercial/schemas";
import * as plansRepo from "@/lib/comercial/repositories/plans.repository";
import * as servicesRepo from "@/lib/comercial/repositories/services.repository";
import type { CommercialPlan, CommercialPlanWithServices, PlanService } from "@/lib/comercial/types";

export async function listarPlanes(opts: { onlyActive?: boolean; q?: string } = {}): Promise<CommercialPlan[]> {
  await requireAdminOSuperAdmin();
  const client = createServiceClient();
  return plansRepo.listPlans(client, opts);
}

export async function crearPlan(input: unknown): Promise<CommercialPlan> {
  await requireAdminOSuperAdmin();
  const parsed = createCommercialPlanSchema.parse(input);
  const client = createServiceClient();
  return plansRepo.insertPlan(client, parsed);
}

export async function editarPlan(id: string, input: unknown): Promise<CommercialPlan> {
  await requireAdminOSuperAdmin();
  const parsed = updateCommercialPlanSchema.parse(input);
  const client = createServiceClient();

  const existing = await plansRepo.getPlanById(client, id);
  if (!existing) throw new Error("Plan comercial no encontrado");

  return plansRepo.updatePlan(client, id, parsed);
}

export async function activarDesactivarPlan(id: string, active: boolean): Promise<CommercialPlan> {
  await requireAdminOSuperAdmin();
  const client = createServiceClient();

  const existing = await plansRepo.getPlanById(client, id);
  if (!existing) throw new Error("Plan comercial no encontrado");

  return plansRepo.setPlanActive(client, id, active);
}

export async function obtenerPlanConServicios(id: string): Promise<CommercialPlanWithServices> {
  await requireAdminOSuperAdmin();
  const client = createServiceClient();

  const plan = await plansRepo.getPlanById(client, id);
  if (!plan) throw new Error("Plan comercial no encontrado");

  const items = await plansRepo.listPlanServices(client, id);
  return { ...plan, items };
}

/**
 * Asocia un servicio (o extra) a un plan comercial. Exactamente uno de
 * los dos debe indicarse (validado en associateServiceToPlanSchema).
 */
export async function asociarServicioAPlan(input: unknown): Promise<PlanService> {
  await requireAdminOSuperAdmin();
  const parsed = associateServiceToPlanSchema.parse(input);
  const client = createServiceClient();

  const plan = await plansRepo.getPlanById(client, parsed.plan_id);
  if (!plan) throw new Error("Plan comercial no encontrado");

  if (parsed.service_id) {
    const service = await servicesRepo.getServiceById(client, parsed.service_id);
    if (!service) throw new Error("Servicio comercial no encontrado");
  }

  return plansRepo.insertPlanService(client, parsed);
}

export async function quitarServicioDePlan(planServiceId: string): Promise<void> {
  await requireAdminOSuperAdmin();
  const client = createServiceClient();
  return plansRepo.removePlanService(client, planServiceId);
}
