import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const CAMPOS_EDITABLES = [
  "nombre",
  "organizacion_id",
  "direccion",
  "ciudad",
  "tipo_espacio",
  "referencia",
  "notas",
] as const;

/**
 * PATCH /api/locaciones/:id
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) updates[campo] = body[campo] || null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("locaciones")
    .update(updates)
    .eq("id", params.id)
    .select("*, organizaciones ( id, nombre )")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, locacion: data });
}

/**
 * DELETE /api/locaciones/:id
 * Las personas ligadas quedan sin locación (no se borran).
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { error } = await service.from("locaciones").delete().eq("id", params.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
