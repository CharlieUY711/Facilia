import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRrhhAuth, puedeVerLegajo } from "@/lib/rrhh/auth";

const PERSONA_LEGAJO_SELECT =
  "*, organizaciones ( id, nombre ), locaciones ( id, nombre )";

const CAMPOS_LEGALES_EDITABLES = [
  "documento",
  "fecha_nacimiento",
  "fecha_ingreso",
  "fecha_egreso",
  "tipo_contrato",
  "salario",
  "estado_laboral",
] as const;

const TIPOS_CONTRATO_VALIDOS = ["indefinido", "plazo_fijo", "pasantia", "honorarios", "otro"] as const;
const ESTADOS_LABORALES_VALIDOS = ["activo", "inactivo", "licencia"] as const;

/**
 * GET /api/rrhh/personas/:id
 * Legajo completo de una persona. Accesible por Admin, o por la
 * propia persona (autoservicio, /dashboard/mi-legajo).
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getRrhhAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  if (!puedeVerLegajo(auth, params.id)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("personas")
    .select(PERSONA_LEGAJO_SELECT)
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true, persona: data });
}

/**
 * PATCH /api/rrhh/personas/:id
 * Edita los datos LEGALES del legajo (documento, fechas, contrato,
 * salario, estado laboral). Solo Admin — el colaborador nunca edita
 * libremente sus propios datos legales.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getRrhhAuth();
  if (!auth || !auth.isAdmin) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  for (const campo of CAMPOS_LEGALES_EDITABLES) {
    if (!(campo in body)) continue;
    if (campo === "tipo_contrato" && body.tipo_contrato && !TIPOS_CONTRATO_VALIDOS.includes(body.tipo_contrato)) {
      return NextResponse.json({ ok: false, error: "Tipo de contrato inválido" }, { status: 400 });
    }
    if (campo === "estado_laboral" && body.estado_laboral && !ESTADOS_LABORALES_VALIDOS.includes(body.estado_laboral)) {
      return NextResponse.json({ ok: false, error: "Estado laboral inválido" }, { status: 400 });
    }
    updates[campo] = body[campo] === "" ? null : body[campo];
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("personas")
    .update(updates)
    .eq("id", params.id)
    .select(PERSONA_LEGAJO_SELECT)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, persona: data });
}
