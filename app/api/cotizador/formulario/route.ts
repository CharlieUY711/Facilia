import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Sin esto, Next.js App Router trata este GET como estático (no usa
// cookies/headers/params dinámicos) y lo congela en el build/primer
// request — sirviendo esa respuesta vieja hasta el próximo deploy, sin
// volver a consultar Supabase. Bug real detectado en producción: los
// UPDATE de limpieza de pasos/campos (2026-07-30) no se reflejaban en
// /api/cotizador/formulario pese a estar aplicados en la base.
export const dynamic = "force-dynamic";

/**
 * GET /api/cotizador/formulario
 *
 * Estructura completa y resuelta del wizard público: pasos activos, con
 * sus campos activos, y para cada campo sus opciones YA resueltas:
 * - si el campo tiene variable_id, las opciones salen de
 *   cotizador_opciones (activas) de esa variable.
 * - si no, salen de la columna `opciones` propia del campo (jsonb).
 *
 * Pública (sin requireAdmin). La consume components/CotizadorForm.tsx
 * (fetch a este endpoint al montar el wizard) — pero solo para resolver
 * las OPCIONES de cada campo vía buscarCampoPorCodigo()/conOpciones()/
 * conFilas(); la estructura de pasos/navegación del wizard sigue
 * hardcodeada en el componente, no viene de acá. Ojo: buscarCampoPorCodigo
 * busca por código de campo de NIVEL SUPERIOR únicamente — no resuelve
 * códigos que solo existen anidados dentro de `opciones.filas` (ver
 * CAMPO.tipo_ambiente en CotizadorForm.tsx, que por este motivo nunca
 * matchea y siempre cae al catálogo hardcodeado legado).
 *
 * Shape de respuesta:
 * {
 *   ok: true,
 *   pasos: [{
 *     id, codigo, nombre, orden, descripcion,
 *     campos: [{
 *       id, nombre, codigo, tipo_input, obligatorio, orden,
 *       opciones: [...] | { filas: [...] } | null
 *     }]
 *   }]
 * }
 */
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_pasos")
    .select(
      `
      id, codigo, nombre, orden, descripcion, activo,
      cotizador_campos (
        id, nombre, codigo, tipo_input, obligatorio, orden, opciones, variable_id, activo,
        cotizador_variables (
          id, codigo, activo,
          cotizador_opciones ( id, nombre, codigo, factor, activo )
        )
      )
    `
    )
    .eq("activo", true)
    .order("orden", { ascending: true })
    .order("orden", { ascending: true, foreignTable: "cotizador_campos" });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const pasos = (data ?? []).map((paso: any) => ({
    id: paso.id,
    codigo: paso.codigo,
    nombre: paso.nombre,
    orden: paso.orden,
    descripcion: paso.descripcion,
    campos: (paso.cotizador_campos ?? [])
      .filter((campo: any) => campo.activo)
      .map((campo: any) => {
        let opciones = campo.opciones ?? null;

        // Campo "de precio": sus opciones vienen de la variable vinculada,
        // no de la columna `opciones` propia (que debería estar vacía).
        if (campo.variable_id && campo.cotizador_variables?.activo) {
          opciones = (campo.cotizador_variables.cotizador_opciones ?? [])
            .filter((o: any) => o.activo)
            .map((o: any) => ({ value: o.codigo, label: o.nombre, factor: o.factor }));
        }

        return {
          id: campo.id,
          nombre: campo.nombre,
          codigo: campo.codigo,
          tipo_input: campo.tipo_input,
          obligatorio: campo.obligatorio,
          orden: campo.orden,
          opciones,
        };
      }),
  }));

  return NextResponse.json({ ok: true, pasos });
}
