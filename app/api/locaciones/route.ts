import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

/**
 * GET /api/locaciones
 * Lista todas las locaciones (sedes donde se presta el servicio),
 * junto con el nombre de la organización si están vinculadas.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("locaciones")
    .select("*, organizaciones ( id, nombre )")
    .order("nombre", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, locaciones: data });
}

/**
 * POST /api/locaciones
 * Body: { nombre, organizacion_id?, direccion?, ciudad?, tipo_espacio?, notas? }
 * organizacion_id es opcional: una locación no siempre coincide con
 * la dirección de una organización cliente.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const nombre = (body.nombre ?? "").trim();
  if (!nombre) {
    return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("locaciones")
    .insert({
      nombre,
      organizacion_id: body.organizacion_id || null,
      direccion: body.direccion || null,
      ciudad: body.ciudad || null,
      tipo_espacio: body.tipo_espacio || null,
      referencia: body.referencia || null,
      notas: body.notas || null,
      created_by: auth.uid,
    })
    .select("*, organizaciones ( id, nombre )")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, locacion: data });
}
