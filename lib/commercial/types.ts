/**
 * FACILIA Commercial Engine — Tipos de dominio
 * ----------------------------------------------------------------
 * Refleja 1:1 las tablas definidas en supabase/commercial_engine.sql.
 * Este archivo NO contiene datos ni valores de negocio hardcodeados —
 * solo formas de datos (a diferencia de lib/pricingData.ts, que sí
 * hardcodea precios; ese archivo no se toca).
 */

export type UnidadMedida = "m2" | "unidad" | "visita" | "mes";

export type CategoriaServicio = "servicio" | "insumo" | "equipo" | "otro";

export type TipoRegla =
  | "recargo_fijo"
  | "recargo_porcentual"
  | "descuento_por_volumen"
  | "bundle"
  | "condicional";

// ── commercial_services ──────────────────────────────────────────
export interface CommercialService {
  id: string;
  name: string;
  description: string | null;
  category: CategoriaServicio;
  unit_measure: UnidadMedida;
  metadata: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type CommercialServiceInsert = Pick<CommercialService, "name" | "category" | "unit_measure"> &
  Partial<Pick<CommercialService, "description" | "metadata" | "active" | "created_by">>;

export type CommercialServiceUpdate = Partial<
  Pick<CommercialService, "name" | "description" | "category" | "unit_measure" | "metadata">
>;

// ── commercial_extras ────────────────────────────────────────────
// Tipos listos para una fase futura (no se implementa repository/service
// todavía — no fue solicitado en este alcance).
export interface CommercialExtra {
  id: string;
  service_id: string | null;
  name: string;
  description: string | null;
  unit_measure: UnidadMedida;
  metadata: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ── commercial_prices ─────────────────────────────────────────────
export interface CommercialPrice {
  id: string;
  service_id: string | null;
  extra_id: string | null;
  segment: string | null;
  price_min: number;
  price_max: number;
  currency: string;
  valid_from: string; // date ISO (YYYY-MM-DD)
  valid_to: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type CommercialPriceInsert = Pick<CommercialPrice, "price_min" | "price_max" | "valid_from"> &
  Partial<Pick<CommercialPrice, "service_id" | "extra_id" | "segment" | "currency" | "valid_to">>;

// ── internal_costs ────────────────────────────────────────────────
export interface InternalCost {
  id: string;
  service_id: string | null;
  extra_id: string | null;
  concept: string;
  cost_min: number;
  cost_max: number;
  valid_from: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type InternalCostInsert = Pick<InternalCost, "concept" | "cost_min" | "cost_max" | "valid_from"> &
  Partial<Pick<InternalCost, "service_id" | "extra_id">>;

export type InternalCostUpdate = Partial<
  Pick<InternalCost, "concept" | "cost_min" | "cost_max" | "valid_from">
>;

// ── pricing_rules ─────────────────────────────────────────────────
// Tipos listos para una fase futura (no se implementa repository/service
// todavía — no fue solicitado en este alcance).
export interface PricingRule {
  id: string;
  name: string;
  service_id: string | null;
  rule_type: TipoRegla;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ── commercial_plans ──────────────────────────────────────────────
export interface CommercialPlan {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export type CommercialPlanInsert = Pick<CommercialPlan, "name" | "valid_from"> &
  Partial<Pick<CommercialPlan, "description" | "valid_to">>;

// ── plan_services ─────────────────────────────────────────────────
export interface PlanService {
  id: string;
  plan_id: string;
  service_id: string | null;
  extra_id: string | null;
  included_at_no_extra_cost: boolean;
  created_at: string;
}

export type PlanServiceInsert = Pick<PlanService, "plan_id"> &
  Partial<Pick<PlanService, "service_id" | "extra_id" | "included_at_no_extra_cost">>;

export interface PlanServiceWithName extends PlanService {
  commercial_services: { name: string } | null;
}

export interface CommercialPlanWithServices extends CommercialPlan {
  items: PlanServiceWithName[];
}
