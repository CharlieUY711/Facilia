import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRrhhAuth, puedeVerLegajo } from "@/lib/rrhh/auth";

const ESTADOS_VALIDOS = ["pendiente", "en_curso", "completada"] as const;

/**
 * PATCH /api/rrhh/tareas/:id
 * El colaborador (o Admin) cambia el estado de la tarea. Solo Admin
 * puede editar título/descripción/fecha/locación.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getRrhhAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { data: tarea, error: fetchError } = await service
    .from("rrhh_tareas")
    .select("id, persona_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  if (!tarea) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
  if (!puedeVerLegajo(auth, tarea.persona_id)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.estado !== undefined) {
    if (!ESTADOS_VALIDOS.includes(body.estado)) {
      return NextResponse.json({ ok: false, error: "Estado inválido" }, { status: 400 });
    }
    updates.estado = body.estado;
    updates.completada_at = body.estado === "completada" ? new Date().toISOString() : null;
  }

  if (auth.isAdmin) {
    for (const campo of ["titulo", "descripcion", "fecha", "locacion_id"] as const) {
      if (campo in body) updates[campo] = body[campo] || null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const { data, error } = await service
    .from("rrhh_tareas")
    .update(updates)
    .eq("id", params.id)
    .select("*, locaciones ( id, nombre )")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tarea: data });
}

/**
 * DELETE /api/rrhh/tareas/:id — solo Admin.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getRrhhAuth();
  if (!auth || !auth.isAdmin) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const service = createServiceClient();
  const { error } = await service.from("rrhh_tareas").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
