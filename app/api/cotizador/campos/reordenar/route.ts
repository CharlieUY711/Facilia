import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

/**
 * PATCH /api/cotizador/campos/reordenar
 * Body: { items: { id: string; orden: number }[] }
 *
 * Actualiza el orden de varios campos en una sola llamada — pensado para
 * persistir un drag&drop del panel admin (Etapa 5E) sin disparar un PATCH
 * por fila. No valida que todos pertenezcan al mismo paso (no hace falta:
 * el orden es una propiedad del campo, se usa "dentro" de su paso al
 * armar /api/cotizador/formulario).
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const items: { id: string; orden: number }[] = body.items ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "items es obligatorio y no puede estar vacío" }, { status: 400 });
  }
  for (const item of items) {
    if (!item.id || typeof item.orden !== "number") {
      return NextResponse.json({ ok: false, error: `Item inválido: ${JSON.stringify(item)}` }, { status: 400 });
    }
  }

  const supabase = createServiceClient();

  const resultados = [];
  for (const item of items) {
    const { data, error } = await supabase
      .from("cotizador_campos")
      .update({ orden: item.orden })
      .eq("id", item.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Error reordenando campo ${item.id}: ${error.message}` },
        { status: 500 }
      );
    }
    resultados.push(data);
  }

  return NextResponse.json({ ok: true, campos: resultados });
}
