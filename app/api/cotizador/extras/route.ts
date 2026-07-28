import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_CALCULO_VALIDOS = ["fixed", "percentage", "formula"] as const;

/**
 * GET /api/cotizador/extras
 * Lista los adicionales del cotizador (cotizador_extras).
 */
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_extras")
    .select("*")
    .order("orden", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, extras: data });
}

/**
 * POST /api/cotizador/extras
 * Body: { nombre, codigo, tipo_calculo?, valor?, orden? }
 * Solo Super Admin / Administrador.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  const nombre = (body.nombre ?? "").trim();
  const codigo = (body.codigo ?? "").trim();

  if (!nombre) {
    return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (!codigo) {
    return NextResponse.json({ ok: false, error: "El código es obligatorio" }, { status: 400 });
  }
  if (body.tipo_calculo && !TIPOS_CALCULO_VALIDOS.includes(body.tipo_calculo)) {
    return NextResponse.json({ ok: false, error: "tipo_calculo inválido" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: existente, error: errorBusqueda } = await supabase
    .from("cotizador_extras")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();

  if (errorBusqueda) {
    return NextResponse.json({ ok: false, error: errorBusqueda.message }, { status: 500 });
  }
  if (existente) {
    return NextResponse.json(
      { ok: false, error: `Ya existe un adicional con el código "${codigo}"` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("cotizador_extras")
    .insert({
      nombre,
      codigo,
      tipo_calculo: body.tipo_calculo ?? "fixed",
      valor: body.valor ?? 0,
      orden: body.orden ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, extra: data });
}
