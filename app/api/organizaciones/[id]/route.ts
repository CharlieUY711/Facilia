import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_VALIDOS = ["cliente", "proveedor", "interna", "otro"] as const;
const CAMPOS_EDITABLES = [
  "nombre",
  "tipo",
  "rut",
  "email",
  "telefono",
  "sitio_web",
  "direccion",
  "ciudad",
  "notas",
] as const;

/**
 * PATCH /api/organizaciones/:id
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  if (body.tipo && !TIPOS_VALIDOS.includes(body.tipo)) {
    return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) updates[campo] = body[campo] || null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("organizaciones")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, organizacion: data });
}

/**
 * DELETE /api/organizaciones/:id
 * Las locaciones y personas ligadas quedan sin organización (no se borran).
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { error } = await service.from("organizaciones").delete().eq("id", params.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
