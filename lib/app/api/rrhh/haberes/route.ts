import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRrhhAuth } from "@/lib/rrhh/auth";

/**
 * POST /api/rrhh/haberes
 * Body: { persona_id, anio, mes (1-12), monto, detalle?, pagado_at? }
 * Registra o corrige los haberes liquidados de un mes. Solo Admin.
 */
export async function POST(req: NextRequest) {
  const auth = await getRrhhAuth();
  if (!auth || !auth.isAdmin) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { persona_id, anio, mes, monto, detalle, pagado_at } = body;

  if (!persona_id || !anio || !mes || monto === undefined || monto === null) {
    return NextResponse.json({ ok: false, error: "Faltan datos obligatorios" }, { status: 400 });
  }
  if (mes < 1 || mes > 12) {
    return NextResponse.json({ ok: false, error: "Mes inválido" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("rrhh_haberes")
    .upsert(
      {
        persona_id,
        anio,
        mes,
        monto,
        detalle: detalle || {},
        pagado_at: pagado_at || null,
        created_by: auth.uid,
      },
      { onConflict: "persona_id,anio,mes" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, haber: data });
}
