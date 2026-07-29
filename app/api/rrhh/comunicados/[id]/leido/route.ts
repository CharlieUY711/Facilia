import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRrhhAuth } from "@/lib/rrhh/auth";

/**
 * POST /api/rrhh/comunicados/:id/leido
 * Marca el comunicado como leído por el usuario logueado (tiene que
 * tener su propia Persona vinculada).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getRrhhAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  if (!auth.personaId) {
    return NextResponse.json({ ok: false, error: "No tenés una Persona vinculada" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: comunicado, error: fetchError } = await service
    .from("rrhh_comunicados")
    .select("id, para_todos, persona_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  if (!comunicado) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
  if (!comunicado.para_todos && comunicado.persona_id !== auth.personaId) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const { error } = await service
    .from("rrhh_comunicados_lecturas")
    .upsert({ comunicado_id: params.id, persona_id: auth.personaId }, { onConflict: "comunicado_id,persona_id" });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
