import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_INPUT_VALIDOS = ["select", "number", "text", "boolean", "select_repetible"];

/**
 * PATCH /api/cotizador/campos/:id
 * Body: { nombre?, codigo?, tipo_input?, variable_id?, opciones?,
 *         obligatorio?, orden?, activo? }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  if (body.tipo_input !== undefined && !TIPOS_INPUT_VALIDOS.includes(body.tipo_input)) {
    return NextResponse.json(
      { ok: false, error: `tipo_input inválido. Debe ser uno de: ${TIPOS_INPUT_VALIDOS.join(", ")}` },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};
  if (body.nombre !== undefined) update.nombre = body.nombre;
  if (body.codigo !== undefined) update.codigo = body.codigo;
  if (body.tipo_input !== undefined) update.tipo_input = body.tipo_input;
  if (body.variable_id !== undefined) update.variable_id = body.variable_id;
  if (body.opciones !== undefined) update.opciones = body.opciones;
  if (body.obligatorio !== undefined) update.obligatorio = body.obligatorio;
  if (body.orden !== undefined) update.orden = body.orden;
  if (body.activo !== undefined) update.activo = body.activo;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_campos")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "Ese paso ya tiene otro campo con ese código" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, campo: data });
}

/**
 * DELETE /api/cotizador/campos/:id
 * Borrado lógico (activo=false), nunca físico.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_campos")
    .update({ activo: false })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, campo: data });
}
