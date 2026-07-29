import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRrhhAuth, puedeVerLegajo } from "@/lib/rrhh/auth";

/**
 * GET /api/rrhh/tareas?persona_id=...
 * Lista las tareas asignadas a una persona (Admin, o la propia
 * persona en modo autoservicio).
 */
export async function GET(req: NextRequest) {
  const auth = await getRrhhAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const personaId = req.nextUrl.searchParams.get("persona_id");
  if (!personaId) return NextResponse.json({ ok: false, error: "Falta persona_id" }, { status: 400 });
  if (!puedeVerLegajo(auth, personaId)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("rrhh_tareas")
    .select("*, locaciones ( id, nombre )")
    .eq("persona_id", personaId)
    .order("fecha", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tareas: data });
}

/**
 * POST /api/rrhh/tareas
 * Body: { persona_id, titulo, descripcion?, fecha?, locacion_id? }
 * Instrucción diaria, manual o vinculada a una locación. Solo Admin
 * asigna tareas.
 */
export async function POST(req: NextRequest) {
  const auth = await getRrhhAuth();
  if (!auth || !auth.isAdmin) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { persona_id, titulo, descripcion, fecha, locacion_id } = body;
  if (!persona_id || !String(titulo || "").trim()) {
    return NextResponse.json({ ok: false, error: "Faltan datos obligatorios" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("rrhh_tareas")
    .insert({
      persona_id,
      titulo: titulo.trim(),
      descripcion: descripcion || null,
      fecha: fecha || null,
      locacion_id: locacion_id || null,
      created_by: auth.uid,
    })
    .select("*, locaciones ( id, nombre )")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tarea: data });
}
