import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRrhhAuth, puedeVerLegajo } from "@/lib/rrhh/auth";

/**
 * GET /api/rrhh/comunicados?persona_id=...
 * Comunicados visibles para esa persona: los de "a todo el equipo"
 * más los dirigidos puntualmente a ella, con marca de leído/no leído.
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
  const { data: comunicados, error } = await service
    .from("rrhh_comunicados")
    .select("*, personas ( id, nombre )")
    .or(`para_todos.eq.true,persona_id.eq.${personaId}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const ids = (comunicados ?? []).map((c: any) => c.id);
  let leidosSet = new Set<string>();
  if (ids.length > 0) {
    const { data: lecturas } = await service
      .from("rrhh_comunicados_lecturas")
      .select("comunicado_id")
      .eq("persona_id", personaId)
      .in("comunicado_id", ids);
    leidosSet = new Set((lecturas ?? []).map((l: any) => l.comunicado_id));
  }

  const data = (comunicados ?? []).map((c: any) => ({ ...c, leido: leidosSet.has(c.id) }));
  return NextResponse.json({ ok: true, comunicados: data });
}

/**
 * POST /api/rrhh/comunicados
 * Body: { titulo, cuerpo, para_todos, persona_id? }
 * A todo el equipo o a una persona puntual. Solo Admin.
 */
export async function POST(req: NextRequest) {
  const auth = await getRrhhAuth();
  if (!auth || !auth.isAdmin) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const titulo = String(body.titulo || "").trim();
  const cuerpo = String(body.cuerpo || "").trim();
  const paraTodos = Boolean(body.para_todos);

  if (!titulo || !cuerpo) {
    return NextResponse.json({ ok: false, error: "Faltan datos obligatorios" }, { status: 400 });
  }
  if (!paraTodos && !body.persona_id) {
    return NextResponse.json({ ok: false, error: "Elegí a quién va dirigido" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("rrhh_comunicados")
    .insert({
      titulo,
      cuerpo,
      para_todos: paraTodos,
      persona_id: paraTodos ? null : body.persona_id,
      created_by: auth.uid,
    })
    .select("*, personas ( id, nombre )")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, comunicado: { ...data, leido: false } });
}
