/**
 * Service — Tarifas comerciales (commercial_prices)
 * ----------------------------------------------------------------
 * No hardcodea ningún valor de precio: todo se lee/escribe en la
 * tabla commercial_prices. Esto es intencionalmente distinto del
 * cotizador actual (lib/pricingData.ts), que se mantiene sin cambios.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminOSuperAdmin } from "@/lib/comercial/permissions";
import { createCommercialPriceSchema } from "@/lib/comercial/schemas";
import * as pricesRepo from "@/lib/comercial/repositories/prices.repository";
import * as servicesRepo from "@/lib/comercial/repositories/services.repository";
import type { CommercialPrice } from "@/lib/comercial/types";

/**
 * Lista todas las tarifas para la pantalla de administración (tabla +
 * búsqueda por nombre de servicio + filtro activo/inactivo).
 */
export async function listarTarifas(opts: { onlyActive?: boolean; q?: string } = {}) {
  await requireAdminOSuperAdmin();
  const client = createServiceClient();
  return pricesRepo.listAllPrices(client, opts);
}

/**
 * Activa o desactiva una tarifa puntual, sin crear una versión nueva.
 * Útil para corregir un error de carga sin generar un registro extra
 * en el historial.
 */
export async function activarDesactivarTarifa(id: string, active: boolean) {
  await requireAdminOSuperAdmin();
  const client = createServiceClient();
  return pricesRepo.setPriceActive(client, id, active);
}

/**
 * Consulta el precio vigente de un servicio o extra en una fecha dada
 * (por defecto, hoy). Devuelve null si no hay ninguna tarifa vigente.
 */
export async function consultarPrecioVigente(target: {
  serviceId?: string;
  extraId?: string;
  segment?: string;
  date?: string;
}): Promise<CommercialPrice | null> {
  await requireAdminOSuperAdmin();

  if (!target.serviceId && !target.extraId) {
    throw new Error("Debe indicarse un servicio o un extra para consultar el precio vigente");
  }

  const client = createServiceClient();
  return pricesRepo.getCurrentPrice(client, target);
}

/**
 * Actualiza la tarifa de un servicio/extra. No sobreescribe el precio
 * anterior: crea un nuevo registro vigente y desactiva el/los
 * anteriores, preservando el historial (útil para auditoría y para no
 * alterar retroactivamente cotizaciones/leads ya generados con la
 * tarifa vieja).
 */
export async function actualizarTarifa(input: unknown): Promise<CommercialPrice> {
  await requireAdminOSuperAdmin();
  const parsed = createCommercialPriceSchema.parse(input);
  const client = createServiceClient();

  if (parsed.service_id) {
    const service = await servicesRepo.getServiceById(client, parsed.service_id);
    if (!service) throw new Error("Servicio comercial no encontrado");
  }

  const previous = parsed.service_id
    ? await pricesRepo.listPricesForService(client, parsed.service_id)
    : parsed.extra_id
      ? await pricesRepo.listPricesForExtra(client, parsed.extra_id)
      : [];

  const nuevo = await pricesRepo.insertPrice(client, parsed);

  const vigentesAnteriores = previous.filter((p) => p.active && p.id !== nuevo.id);
  await Promise.all(vigentesAnteriores.map((p) => pricesRepo.deactivatePrice(client, p.id)));

  return nuevo;
}
