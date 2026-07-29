import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

/**
 * GET /api/cotizador/parametros
 * Lista los parámetros globales del motor (cotizador_config): precio por
 * m², margen comercial, costo de hora operario, etc. Solo Super Admin / Admin
 * — es el endpoint que alimenta la sección "Parámetros" del panel admin
 * (distinto de /api/cotizador/config, que es el que consume el cotizador
 * público y no requiere sesión).
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

/**
 * PATCH /api/cotizador/parametros
 * Body: { clave, valor } o { parametros: { clave, valor }[] }
 * Hace upsert por "clave" (no crea parámetros nuevos con nombres libres:
 * solo actualiza valor/descripcion de claves que ya existan, para evitar
 * que se generen parámetros sueltos que el motor nunca lee).
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const items: { clave: string; valor: number; descripcion?: string }[] = Array.isArray(body.parametros)
    ? body.parametros
    : [body];

  for (const item of items) {
    if (!item.clave || typeof item.valor !== "number" || Number.isNaN(item.valor)) {
      return NextResponse.json(
        { ok: false, error: `Parámetro inválido: ${JSON.stringify(item)}` },
        { status: 400 }
      );
    }
  }

  const supabase = createServiceClient();

  // Solo actualiza claves existentes — no inserta claves nuevas por esta vía.
  const resultados = [];
  for (const item of items) {
    const update: Record<string, unknown> = { valor: item.valor };
    if (item.descripcion !== undefined) update.descripcion = item.descripcion;

    const { data, error } = await supabase
      .from("cotizador_config")
      .update(update)
      .eq("clave", item.clave)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Error actualizando "${item.clave}": ${error.message}` },
        { status: 500 }
      );
    }
    resultados.push(data);
  }

  return NextResponse.json({ ok: true, parametros: resultados });
}
