/**
 * FACILIA Commercial Engine — Validators (Zod)
 * ----------------------------------------------------------------
 * Mismo enfoque que app/api/cotizar/route.ts y app/api/leads/route.ts:
 * un schema por entidad/operación, validado en la capa de servicio
 * antes de tocar la base de datos.
 */

import { z } from "zod";

export const unidadMedidaSchema = z.enum(["m2", "unidad", "visita", "mes"]);
export const categoriaServicioSchema = z.enum(["servicio", "insumo", "equipo", "otro"]);

// ── Servicios comerciales ─────────────────────────────────────────
export const createCommercialServiceSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  category: categoriaServicioSchema,
  unit_measure: unidadMedidaSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const updateCommercialServiceSchema = createCommercialServiceSchema.partial();

// ── Tarifas (commercial_prices) ───────────────────────────────────
export const createCommercialPriceSchema = z
  .object({
    service_id: z.string().uuid().optional(),
    extra_id: z.string().uuid().optional(),
    segment: z.string().optional(),
    price_min: z.number().nonnegative(),
    price_max: z.number().nonnegative(),
    currency: z.string().length(3).optional(),
    valid_from: z.string().min(1, "valid_from es obligatorio"),
    valid_to: z.string().optional(),
  })
  .refine((d) => d.price_max >= d.price_min, {
    message: "price_max debe ser mayor o igual a price_min",
    path: ["price_max"],
  })
  .refine((d) => Boolean(d.service_id) !== Boolean(d.extra_id), {
    message: "Debe indicarse exactamente uno: service_id o extra_id",
    path: ["service_id"],
  });

// ── Costos internos ───────────────────────────────────────────────
export const createInternalCostSchema = z
  .object({
    service_id: z.string().uuid().optional(),
    extra_id: z.string().uuid().optional(),
    concept: z.string().min(2, "El concepto debe tener al menos 2 caracteres"),
    cost_min: z.number().nonnegative(),
    cost_max: z.number().nonnegative(),
    valid_from: z.string().min(1, "valid_from es obligatorio"),
  })
  .refine((d) => d.cost_max >= d.cost_min, {
    message: "cost_max debe ser mayor o igual a cost_min",
    path: ["cost_max"],
  })
  .refine((d) => Boolean(d.service_id) !== Boolean(d.extra_id), {
    message: "Debe indicarse exactamente uno: service_id o extra_id",
    path: ["service_id"],
  });

export const updateInternalCostSchema = z.object({
  concept: z.string().min(2).optional(),
  cost_min: z.number().nonnegative().optional(),
  cost_max: z.number().nonnegative().optional(),
  valid_from: z.string().optional(),
});

// ── Planes comerciales ────────────────────────────────────────────
export const createCommercialPlanSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  valid_from: z.string().min(1, "valid_from es obligatorio"),
  valid_to: z.string().optional(),
});

export const updateCommercialPlanSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
});

export const associateServiceToPlanSchema = z
  .object({
    plan_id: z.string().uuid(),
    service_id: z.string().uuid().optional(),
    extra_id: z.string().uuid().optional(),
    included_at_no_extra_cost: z.boolean().optional(),
  })
  .refine((d) => Boolean(d.service_id) !== Boolean(d.extra_id), {
    message: "Debe indicarse exactamente uno: service_id o extra_id",
    path: ["service_id"],
  });
