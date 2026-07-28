import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_CALCULO_VALIDOS = ["fixed", "percentage", "formula"] as const;

/**
 * PATCH /api/cotizador/extras/:id
 * Acepta nombre, codigo, tipo_calculo, valor, orden, activo.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  if (body.tipo_calculo && !TIPOS_CALCULO_VALIDOS.includes(body.tipo_calculo)) {
    return NextResponse.json({ ok: false, error: "tipo_calculo inválido" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (body.codigo) {
    const { data: duplicado, error: errorDuplicado } = await supabase
      .from("cotizador_extras")
      .select("id")
      .eq("codigo", body.codigo)
      .neq("id", params.id)
      .maybeSingle();

    if (errorDuplicado) {
      return NextResponse.json({ ok: false, error: errorDuplicado.message }, { status: 500 });
    }
    if (duplicado) {
      return NextResponse.json(
        { ok: false, error: `Ya existe un adicional con el código "${body.codigo}"` },
        { status: 400 }
      );
    }
  }

  const updates: Record<string, unknown> = {};
  if ("nombre" in body) updates.nombre = body.nombre;
  if ("codigo" in body) updates.codigo = body.codigo;
  if ("tipo_calculo" in body) updates.tipo_calculo = body.tipo_calculo;
  if ("valor" in body) updates.valor = body.valor;
  if ("orden" in body) updates.orden = body.orden;
  if ("activo" in body) updates.activo = body.activo;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cotizador_extras")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, extra: data });
}

/**
 * DELETE /api/cotizador/extras/:id
 * Eliminación lógica (activo=false).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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
