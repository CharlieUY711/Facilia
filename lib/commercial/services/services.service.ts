/**
 * Service — Servicios comerciales
 * ----------------------------------------------------------------
 * Orquesta permisos + validación + repository. Ningún componente
 * React ni ruta API debe consultar commercial_services directamente:
 * siempre a través de estas funciones.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminOSuperAdmin } from "@/lib/comercial/permissions";
import { createCommercialServiceSchema, updateCommercialServiceSchema } from "@/lib/comercial/schemas";
import * as servicesRepo from "@/lib/comercial/repositories/services.repository";
import type { CommercialService } from "@/lib/comercial/types";

/**
 * Lista los servicios comerciales. Disponible para admin/super_admin.
 * `onlyActive` permite a las pantallas de administración ver también
 * los inactivos (ej. para reactivarlos).
 */
export async function listarServiciosComerciales(
  opts: { onlyActive?: boolean; q?: string } = {}
): Promise<CommercialService[]> {
  await requireAdminOSuperAdmin();
  const client = createServiceClient();
  return servicesRepo.listServices(client, opts);
}

export async function crearServicio(input: unknown): Promise<CommercialService> {
  const userId = await requireAdminOSuperAdmin();
  const parsed = createCommercialServiceSchema.parse(input);
  const client = createServiceClient();
  return servicesRepo.insertService(client, { ...parsed, created_by: userId });
}

export async function editarServicio(id: string, input: unknown): Promise<CommercialService> {
  await requireAdminOSuperAdmin();
  const parsed = updateCommercialServiceSchema.parse(input);
  const client = createServiceClient();

  const existing = await servicesRepo.getServiceById(client, id);
  if (!existing) throw new Error("Servicio comercial no encontrado");

  return servicesRepo.updateService(client, id, parsed);
}

/**
 * Activa o desactiva un servicio comercial. Es un soft-disable (no se
 * elimina el registro), para no romper tarifas/planes/reglas que ya
 * lo referencian históricamente.
 */
export async function activarDesactivarServicio(id: string, active: boolean): Promise<CommercialService> {
  await requireAdminOSuperAdmin();
  const client = createServiceClient();

  const existing = await servicesRepo.getServiceById(client, id);
  if (!existing) throw new Error("Servicio comercial no encontrado");

  return servicesRepo.setServiceActive(client, id, active);
}
