import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const CANTIDAD_FUENTES_VALIDAS = ["ninguna", "input_cliente", "cantidad_banos"];

/**
 * PATCH /api/cotizador/variables/:id
 * Body: { nombre?, orden?, obligatorio?, afecta_precio?, descripcion?, activo?,
 *         cantidad_fuente?, unidad_cantidad?, cantidad_min?, cantidad_max?,
 *         accesorio_variable_id? }
 *
 * accesorio_variable_id (Etapa 5I) — para insumos que dependen de un
 * electrodoméstico (ej. Agua → Dispensador). Apunta a otra fila de
 * cotizador_variables. Se manda `null` explícito para desvincular.
 *
 * OJO: "codigo" y "tipo" NO se pueden editar desde acá a propósito — son la
 * referencia estable que usa el motor de cálculo (lib/cotizador/engine.ts)
 * y el cotizador público; cambiarlos rompería presupuestos ya calculados y
 * cualquier referencia guardada. Si el body los trae, se ignoran.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  if (body.cantidad_fuente !== undefined && !CANTIDAD_FUENTES_VALIDAS.includes(body.cantidad_fuente)) {
    return NextResponse.json(
      { ok: false, error: `cantidad_fuente inválida. Debe ser una de: ${CANTIDAD_FUENTES_VALIDAS.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const update: Record<string, unknown> = {};
  if (body.nombre !== undefined) update.nombre = body.nombre;
  if (body.orden !== undefined) update.orden = body.orden;
  if (body.obligatorio !== undefined) update.obligatorio = body.obligatorio;
  if (body.afecta_precio !== undefined) update.afecta_precio = body.afecta_precio;
  if (body.descripcion !== undefined) update.descripcion = body.descripcion;
  if (body.activo !== undefined) update.activo = body.activo;
  if (body.cantidad_fuente !== undefined) update.cantidad_fuente = body.cantidad_fuente;
  if (body.unidad_cantidad !== undefined) update.unidad_cantidad = body.unidad_cantidad;
  if (body.cantidad_min !== undefined) update.cantidad_min = body.cantidad_min;
  if (body.cantidad_max !== undefined) update.cantidad_max = body.cantidad_max;
  if (body.accesorio_variable_id !== undefined) update.accesorio_variable_id = body.accesorio_variable_id;
  // body.codigo y body.tipo se ignoran a propósito (ver comentario arriba).

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cotizador_variables")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, variable: data });
}

/**
 * DELETE /api/cotizador/variables/:id
 * Borrado lógico (activo=false), nunca físico — una variable puede estar
 * referenciada por presupuestos ya calculados.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_variables")
    .update({ activo: false })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, variable: data });
}
