import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

/**
 * PATCH /api/cotizador/pasos/:id
 * Body: { nombre?, orden?, descripcion?, activo? }
 *
 * "codigo" no se puede editar desde acá a propósito — es la referencia
 * estable que usa el seed y (más adelante) el cotizador público. Si el
 * body lo trae, se ignora.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.nombre !== undefined) update.nombre = body.nombre;
  if (body.orden !== undefined) update.orden = body.orden;
  if (body.descripcion !== undefined) update.descripcion = body.descripcion;
  if (body.activo !== undefined) update.activo = body.activo;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_pasos")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, paso: data });
}

/**
 * DELETE /api/cotizador/pasos/:id
 * Borrado lógico (activo=false). Sus campos (cotizador_campos) quedan
 * intactos en la base — al desactivar el paso, /api/cotizador/formulario
 * ya no los va a devolver, pero no se pierden datos.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_pasos")
    .update({ activo: false })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, paso: data });
}
