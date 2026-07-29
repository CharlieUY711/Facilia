import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_CALCULO_VALIDOS = ["fixed", "percentage", "formula"];

/**
 * GET /api/cotizador/extras
 * Lista los servicios adicionales configurables (limpieza de vidrios,
 * sanitización, etc.). Solo Super Admin / Admin.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

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
 * Body: { nombre, codigo, tipo_calculo, valor, orden? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  const nombre = (body.nombre ?? "").trim();
  const codigo = (body.codigo ?? "").trim();
  const tipo_calculo = body.tipo_calculo ?? "fixed";
  const valor = Number(body.valor ?? 0);

  if (!nombre) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  if (!codigo) return NextResponse.json({ ok: false, error: "El código es obligatorio" }, { status: 400 });
  if (!TIPOS_CALCULO_VALIDOS.includes(tipo_calculo)) {
    return NextResponse.json(
      { ok: false, error: `tipo_calculo inválido. Debe ser uno de: ${TIPOS_CALCULO_VALIDOS.join(", ")}` },
      { status: 400 }
    );
  }
  if (Number.isNaN(valor)) {
    return NextResponse.json({ ok: false, error: "El valor debe ser numérico" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_extras")
    .insert({ nombre, codigo, tipo_calculo, valor, orden: body.orden ?? 0 })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: `Ya existe un adicional con el código "${codigo}"` }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, extra: data });
}
