import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

/**
 * GET /api/cotizador/pasos
 * Todos los pasos del wizard público (activos e inactivos), con sus
 * campos anidados. Lo usa el panel admin (Etapa 5E). El cotizador público
 * usa /api/cotizador/formulario (solo pasos/campos activos).
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_pasos")
    .select(
      `
      *,
      cotizador_campos ( * )
    `
    )
    .order("orden", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pasos: data });
}

/**
 * POST /api/cotizador/pasos
 * Body: { codigo, nombre, orden?, descripcion? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  const nombre = (body.nombre ?? "").trim();
  const codigo = (body.codigo ?? "").trim();

  if (!nombre) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  if (!codigo) return NextResponse.json({ ok: false, error: "El código es obligatorio" }, { status: 400 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_pasos")
    .insert({
      codigo,
      nombre,
      orden: body.orden ?? 0,
      descripcion: body.descripcion ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: `Ya existe un paso con el código "${codigo}"` }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, paso: data });
}
