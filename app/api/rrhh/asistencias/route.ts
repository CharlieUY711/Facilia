import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRrhhAuth } from "@/lib/rrhh/auth";

const ESTADOS_VALIDOS = ["presente", "tarde", "ausente", "licencia"] as const;

/**
 * POST /api/rrhh/asistencias
 * Body: { persona_id, fecha (YYYY-MM-DD), estado, notas? }
 * Registra o corrige la asistencia de un día puntual. Solo Admin.
 */
export async function POST(req: NextRequest) {
  const auth = await getRrhhAuth();
  if (!auth || !auth.isAdmin) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { persona_id, fecha, estado, notas } = body;

  if (!persona_id || !fecha) {
    return NextResponse.json({ ok: false, error: "Faltan datos obligatorios" }, { status: 400 });
  }
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return NextResponse.json({ ok: false, error: "Estado inválido" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("rrhh_asistencias")
    .upsert(
      { persona_id, fecha, estado, notas: notas || null, created_by: auth.uid },
      { onConflict: "persona_id,fecha" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, asistencia: data });
}
