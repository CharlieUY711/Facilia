import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

/**
 * PATCH /api/cotizador/presentaciones/:id
 * Body: { nombre?, codigo?, valor?, factor?, orden?, activo? }
 * Solo Super Admin / Admin.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.nombre !== undefined) update.nombre = body.nombre;
  if (body.codigo !== undefined) update.codigo = body.codigo;
  if (body.valor !== undefined) update.valor = body.valor;
  if (body.factor !== undefined) update.factor = body.factor;
  if (body.orden !== undefined) update.orden = body.orden;
  if (body.activo !== undefined) update.activo = body.activo;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_presentaciones")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Ya existe otra presentación con ese código para esa opción" },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, presentacion: data });
}

/**
 * DELETE /api/cotizador/presentaciones/:id
 * Borrado lógico (activo=false), nunca físico.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_presentaciones")
    .update({ activo: false })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, presentacion: data });
}
