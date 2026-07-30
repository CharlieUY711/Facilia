import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

// Columnas de auditoría (quién/cuándo modificó cada parámetro) — agregadas
// en la migración 2026_07_29_cotizador_config_auditoria.sql. Este endpoint
// funciona igual si esa migración todavía no corrió contra la base: intenta
// pedir/guardar la auditoría y, si la columna o la FK no existen todavía,
// cae a la versión sin auditoría en vez de tirar 500. Así el tab
// "Parámetros" nunca queda roto por un despliegue de código adelantado a
// la migración.
const SELECT_CON_AUDITORIA =
  "*, actualizado_por_perfil:profiles!cotizador_config_actualizado_por_fkey(nombre,email)";

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

  const conAuditoria = await supabase
    .from("cotizador_config")
    .select(SELECT_CON_AUDITORIA)
    .order("clave", { ascending: true });

  if (!conAuditoria.error) {
    return NextResponse.json({ ok: true, parametros: conAuditoria.data });
  }

  // Migración de auditoría todavía no aplicada en esta base — logueamos el
  // motivo real (se ve en la terminal de `next dev` / logs del server) y
  // reintentamos sin esas columnas para no romper la pantalla.
  console.error(
    "[GET /api/cotizador/parametros] falló el select con auditoría, reintentando sin ella:",
    conAuditoria.error
  );

  const { data, error } = await supabase
    .from("cotizador_config")
    .select("*")
    .order("clave", { ascending: true });

  if (error) {
    console.error("[GET /api/cotizador/parametros] falló también el select plano:", error);
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
    const updateBase: Record<string, unknown> = { valor: item.valor };
    if (item.descripcion !== undefined) updateBase.descripcion = item.descripcion;

    const conAuditoria = await supabase
      .from("cotizador_config")
      .update({ ...updateBase, actualizado_en: new Date().toISOString(), actualizado_por: auth.uid })
      .eq("clave", item.clave)
      .select(SELECT_CON_AUDITORIA)
      .single();

    if (!conAuditoria.error) {
      resultados.push(conAuditoria.data);
      continue;
    }

    console.error(
      `[PATCH /api/cotizador/parametros] falló el update con auditoría para "${item.clave}", reintentando sin ella:`,
      conAuditoria.error
    );

    const { data, error } = await supabase
      .from("cotizador_config")
      .update(updateBase)
      .eq("clave", item.clave)
      .select()
      .single();

    if (error) {
      console.error(`[PATCH /api/cotizador/parametros] falló también el update plano para "${item.clave}":`, error);
      return NextResponse.json(
        { ok: false, error: `Error actualizando "${item.clave}": ${error.message}` },
        { status: 500 }
      );
    }
    resultados.push(data);
  }

  return NextResponse.json({ ok: true, parametros: resultados });
}
