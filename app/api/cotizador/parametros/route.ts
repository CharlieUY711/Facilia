import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

/**
 * GET /api/cotizador/parametros
 * Lista los parámetros globales del cotizador (PRECIO_M2_BASE,
 * HORA_OPERARIO, MARGEN_COMERCIAL, etc.). Usado por el panel admin
 * para editar el motor de cotización.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_config")
    .select("*")
    .order("clave", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, parametros: data });
}

type ParametroInput = { clave?: unknown; valor?: unknown };

function normalizar(items: ParametroInput[]) {
  const normalizados: { clave: string; valor: number }[] = [];

  for (const item of items) {
    const clave = typeof item.clave === "string" ? item.clave.trim() : "";
    const valor = Number(item.valor);

    if (!clave) {
      throw new Error("Cada parámetro necesita una \"clave\"");
    }
    if (!Number.isFinite(valor)) {
      throw new Error(`El valor de "${clave}" debe ser numérico`);
    }

    normalizados.push({ clave, valor });
  }

  return normalizados;
}

/**
 * PATCH /api/cotizador/parametros
 * Body: { clave, valor } o [{ clave, valor }, ...]
 * Hace upsert por clave (crea el parámetro si no existía todavía).
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const items: ParametroInput[] = Array.isArray(body) ? body : [body];

  let normalizados: { clave: string; valor: number }[];
  try {
    normalizados = normalizar(items);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }

  if (normalizados.length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_config")
    .upsert(
      normalizados.map((p) => ({ ...p, updated_at: new Date().toISOString() })),
      { onConflict: "clave" }
    )
    .select();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, parametros: data });
}
