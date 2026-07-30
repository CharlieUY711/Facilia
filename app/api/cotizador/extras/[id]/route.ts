import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_CALCULO_VALIDOS = ["fixed", "percentage", "formula"];

// Auditoría de última modificación (ver 2026_07_29_cotizador_precios_auditoria.sql)
// — mismo patrón de fallback que el resto: si la migración no corrió
// todavía, el guardado no se rompe, solo no queda registrado quién lo hizo.
const SELECT_CON_AUDITORIA =
  "*, actualizado_por_perfil:profiles!cotizador_extras_actualizado_por_fkey(nombre,email)";

/**
 * PATCH /api/cotizador/extras/:id
 * Body: { nombre?, codigo?, tipo_calculo?, valor?, orden?, activo? }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  if (body.tipo_calculo !== undefined && !TIPOS_CALCULO_VALIDOS.includes(body.tipo_calculo)) {
    return NextResponse.json(
      { ok: false, error: `tipo_calculo inválido. Debe ser uno de: ${TIPOS_CALCULO_VALIDOS.join(", ")}` },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};
  if (body.nombre !== undefined) update.nombre = body.nombre;
  if (body.codigo !== undefined) update.codigo = body.codigo;
  if (body.tipo_calculo !== undefined) update.tipo_calculo = body.tipo_calculo;
  if (body.valor !== undefined) update.valor = body.valor;
  if (body.orden !== undefined) update.orden = body.orden;
  if (body.activo !== undefined) update.activo = body.activo;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const conAuditoria = await supabase
    .from("cotizador_extras")
    .update({ ...update, actualizado_en: new Date().toISOString(), actualizado_por: auth.uid })
    .eq("id", params.id)
    .select(SELECT_CON_AUDITORIA)
    .single();

  if (!conAuditoria.error) {
    return NextResponse.json({ ok: true, extra: conAuditoria.data });
  }

  console.error(
    `[PATCH /api/cotizador/extras/${params.id}] falló el update con auditoría, reintentando sin ella:`,
    conAuditoria.error
  );

  const { data, error } = await supabase
    .from("cotizador_extras")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "Ya existe otro adicional con ese código" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, extra: data });
}

/**
 * DELETE /api/cotizador/extras/:id
 * Borrado lógico (activo=false), nunca físico.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_extras")
    .update({ activo: false })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, extra: data });
}
