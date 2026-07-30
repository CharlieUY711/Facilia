import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

/**
 * POST /api/cotizador/presentaciones
 * Body: { opcion_id, nombre, codigo, valor?, factor?, orden? }
 * Crea una presentación nueva bajo una opción existente. Solo Super Admin / Admin.
 *
 * Etapa 5I — Presentación es la segunda dimensión bajo cada Opción
 * (ej. Opción "Estándar" del insumo Agua → Presentación "Salus 20lts").
 * Costo mensual = valor × factor. El motor (lib/cotizador/engine.ts)
 * todavía NO consume esta tabla — sigue calculando con precio_fijo a
 * nivel de opción, igual que antes. Integrar presentaciones al motor es
 * un paso aparte, pendiente.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  if (!body.opcion_id) {
    return NextResponse.json({ ok: false, error: "opcion_id es obligatorio" }, { status: 400 });
  }
  const nombre = (body.nombre ?? "").trim();
  const codigo = (body.codigo ?? "").trim();
  if (!nombre) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  if (!codigo) return NextResponse.json({ ok: false, error: "El código es obligatorio" }, { status: 400 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_presentaciones")
    .insert({
      opcion_id: body.opcion_id,
      nombre,
      codigo,
      valor: body.valor ?? 0,
      factor: body.factor ?? 1,
      orden: body.orden ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { ok: false, error: `Esa opción ya tiene una presentación con el código "${codigo}"` },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    presentacion: data,
  });
}
