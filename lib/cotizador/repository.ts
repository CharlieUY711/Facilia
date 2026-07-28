import { createServiceClient } from "@/lib/supabase/server";
import type { CotizadorConfig, ExtraCotizador, VariableCotizador } from "./engine";

/**
 * Carga la configuración activa del cotizador desde Supabase: variables +
 * sus opciones, parámetros globales y adicionales. Server-side only (usa
 * la Service Role Key, igual que app/api/cotizador/config/route.ts).
 *
 * No cachea entre requests — se llama una vez por cálculo. Si más adelante
 * hace falta cachear, hacerlo a nivel de request (ej. React `cache()`),
 * nunca en una variable de módulo global (los datos deben poder cambiar
 * sin deploy en cuanto se editan desde el panel).
 */
export async function cargarConfiguracion(): Promise<CotizadorConfig> {
  const supabase = createServiceClient();

  const [variablesRes, parametrosRes, extrasRes] = await Promise.all([
    supabase
      .from("cotizador_variables")
      .select(
        `
        id, nombre, codigo, tipo, activo,
        cotizador_opciones ( id, nombre, codigo, factor, precio_fijo, activo )
      `
      )
      .eq("activo", true)
      .order("orden", { ascending: true }),
    supabase.from("cotizador_config").select("clave, valor"),
    supabase.from("cotizador_extras").select("id, nombre, codigo, tipo_calculo, valor, activo"),
  ]);

  if (variablesRes.error) {
    throw new Error(`Error cargando variables del cotizador: ${variablesRes.error.message}`);
  }
  if (parametrosRes.error) {
    throw new Error(`Error cargando parámetros del cotizador: ${parametrosRes.error.message}`);
  }
  if (extrasRes.error) {
    throw new Error(`Error cargando adicionales del cotizador: ${extrasRes.error.message}`);
  }

  const variables: VariableCotizador[] = (variablesRes.data ?? []).map((v: any) => ({
    id: v.id,
    nombre: v.nombre,
    codigo: v.codigo,
    tipo: v.tipo,
    activo: v.activo,
    opciones: (v.cotizador_opciones ?? []).map((o: any) => ({
      id: o.id,
      nombre: o.nombre,
      codigo: o.codigo,
      factor: Number(o.factor),
      precio_fijo: o.precio_fijo === null ? null : Number(o.precio_fijo),
      activo: o.activo,
    })),
  }));

  const parametros: Record<string, number> = {};
  for (const p of parametrosRes.data ?? []) {
    parametros[p.clave] = Number(p.valor);
  }

  const extras: ExtraCotizador[] = (extrasRes.data ?? []).map((e: any) => ({
    id: e.id,
    nombre: e.nombre,
    codigo: e.codigo,
    tipo_calculo: e.tipo_calculo,
    valor: Number(e.valor),
    activo: e.activo,
  }));

  return { variables, parametros, extras };
}
