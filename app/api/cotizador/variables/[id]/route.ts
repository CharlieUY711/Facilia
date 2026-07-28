import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

// "codigo" queda afuera a propósito: cambiarlo rompería las referencias
// que usa el motor (lib/cotizador/engine.ts busca variables por codigo).
const CAMPOS_EDITABLES = [
  "nombre",
  "orden",
  "obligatorio",
  "afecta_precio",
  "descripcion",
  "activo",
] as const;

/**
 * PATCH /api/cotizador/variables/:id
 * Edita una variable existente. Si el body trae "codigo", se ignora
 * silenciosamente (no es editable desde acá).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  const updates: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) updates[campo] = body[campo];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_variables")
    .update(updates)
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
 * Eliminación lógica: marca la variable como inactiva (activo=false) en
 * vez de borrarla físicamente, para no perder el historial de
 * presupuestos que ya la referencian.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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
