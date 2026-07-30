import { createServiceClient } from "@/lib/supabase/server";
import type { CotizadorConfig, ExtraCotizador, VariableCotizador } from "./engine";

/**
 * Carga la configuración activa del cotizador desde Supabase: variables +
 * sus opciones, multiplicadores (Etapa 5J), parámetros globales y
 * adicionales. Server-side only (usa la Service Role Key, igual que
 * app/api/cotizador/config/route.ts).
 *
 * No cachea entre requests — se llama una vez por cálculo. Si más adelante
 * hace falta cachear, hacerlo a nivel de request (ej. React `cache()`),
 * nunca en una variable de módulo global (los datos deben poder cambiar
 * sin deploy en cuanto se editan desde el panel).
 */
export async function cargarConfiguracion(): Promise<CotizadorConfig> {
  const supabase = createServiceClient();

  const [variablesRes, multiplicadoresRes, parametrosRes, extrasRes] = await Promise.all([
    supabase
      .from("cotizador_variables")
      .select(
        `
        id, nombre, codigo, tipo, activo,
        cantidad_fuente, unidad_cantidad, cantidad_min, cantidad_max,
        cantidad_referencia_variable_codigo, cantidad_referencia_multiplicador,
        cotizador_opciones (
          id, nombre, codigo, factor, precio_fijo, activo,
          rendimiento_m2_hora, insumos_m2, frecuencia_independiente, visitas_mes
        )
      `
      )
      .eq("activo", true)
      .order("orden", { ascending: true }),
    supabase
      .from("cotizador_variable_multiplicadores")
      .select("variable_id, tipo_ambiente_codigo, multiplicador"),
    supabase.from("cotizador_config").select("clave, valor"),
    supabase.from("cotizador_extras").select("id, nombre, codigo, tipo_calculo, valor, activo"),
  ]);

  if (variablesRes.error) {
    throw new Error(`Error cargando variables del cotizador: ${variablesRes.error.message}`);
  }
  if (multiplicadoresRes.error) {
    throw new Error(
      `Error cargando multiplicadores del cotizador: ${multiplicadoresRes.error.message}`
    );
  }
  if (parametrosRes.error) {
    throw new Error(`Error cargando parámetros del cotizador: ${parametrosRes.error.message}`);
  }
  if (extrasRes.error) {
    throw new Error(`Error cargando adicionales del cotizador: ${extrasRes.error.message}`);
  }

  const multiplicadoresPorVariable = new Map<
    string,
    { tipo_ambiente_codigo: string; multiplicador: number }[]
  >();
  for (const m of multiplicadoresRes.data ?? []) {
    const lista = multiplicadoresPorVariable.get(m.variable_id) ?? [];
    lista.push({ tipo_ambiente_codigo: m.tipo_ambiente_codigo, multiplicador: Number(m.multiplicador) });
    multiplicadoresPorVariable.set(m.variable_id, lista);
  }

  const variables: VariableCotizador[] = (variablesRes.data ?? []).map((v: any) => ({
    id: v.id,
    nombre: v.nombre,
    codigo: v.codigo,
    tipo: v.tipo,
    activo: v.activo,
    cantidad_fuente: v.cantidad_fuente,
    unidad_cantidad: v.unidad_cantidad,
    cantidad_min: v.cantidad_min === null ? null : Number(v.cantidad_min),
    cantidad_max: v.cantidad_max === null ? null : Number(v.cantidad_max),
    cantidad_referencia_variable_codigo: v.cantidad_referencia_variable_codigo,
    cantidad_referencia_multiplicador: Number(v.cantidad_referencia_multiplicador ?? 1),
    multiplicadores: multiplicadoresPorVariable.get(v.id) ?? [],
    opciones: (v.cotizador_opciones ?? []).map((o: any) => ({
      id: o.id,
      nombre: o.nombre,
      codigo: o.codigo,
      factor: Number(o.factor),
      precio_fijo: o.precio_fijo === null ? null : Number(o.precio_fijo),
      activo: o.activo,
      rendimiento_m2_hora: o.rendimiento_m2_hora === null ? null : Number(o.rendimiento_m2_hora),
      insumos_m2: o.insumos_m2 === null ? null : Number(o.insumos_m2),
      frecuencia_independiente: o.frecuencia_independiente,
      visitas_mes: o.visitas_mes === null ? null : Number(o.visitas_mes),
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
