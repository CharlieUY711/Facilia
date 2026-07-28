/**
 * Service — Costos internos (internal_costs)
 * ----------------------------------------------------------------
 * Exclusivo de super_admin: expone márgenes reales de FACILIA
 * (ver PROJECT_AUDIT.md, riesgo #6). Ninguna función de este archivo
 * es accesible desde admin/colaborador.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/comercial/permissions";
import { createInternalCostSchema, updateInternalCostSchema } from "@/lib/comercial/schemas";
import * as costsRepo from "@/lib/comercial/repositories/costs.repository";
import type { InternalCost } from "@/lib/comercial/types";

export async function listarCostosInternos(
  opts: { serviceId?: string; extraId?: string; onlyActive?: boolean; q?: string } = {}
) {
  await requireSuperAdmin();
  const client = createServiceClient();
  return costsRepo.listInternalCosts(client, opts);
}

export async function crearCostoInterno(input: unknown): Promise<InternalCost> {
  await requireSuperAdmin();
  const parsed = createInternalCostSchema.parse(input);
  const client = createServiceClient();
  return costsRepo.insertInternalCost(client, parsed);
}

export async function editarCostoInterno(id: string, input: unknown): Promise<InternalCost> {
  await requireSuperAdmin();
  const parsed = updateInternalCostSchema.parse(input);
  const client = createServiceClient();
  return costsRepo.updateInternalCost(client, id, parsed);
}

export async function activarDesactivarCostoInterno(id: string, active: boolean): Promise<InternalCost> {
  await requireSuperAdmin();
  const client = createServiceClient();
  return costsRepo.setInternalCostActive(client, id, active);
}
