import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/cotizador/formulario
 *
 * Estructura completa y resuelta del wizard público: pasos activos, con
 * sus campos activos, y para cada campo sus opciones YA resueltas:
 * - si el campo tiene variable_id, las opciones salen de
 *   cotizador_opciones (activas) de esa variable.
 * - si no, salen de la columna `opciones` propia del campo (jsonb).
 *
 * Pública (sin requireAdmin): la va a consumir el cotizador público
 * (Etapa 5D). Por ahora no la usa nadie todavía — sirve para verificar
 * que la estructura cargada en la Etapa 5B se resuelve correctamente
 * antes de tocar CotizadorForm.tsx.
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
