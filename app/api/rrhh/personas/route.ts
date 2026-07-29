import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const PERSONA_LEGAJO_SELECT =
  "*, organizaciones ( id, nombre ), locaciones ( id, nombre )";

/**
 * GET /api/rrhh/personas
 * Lista de colaboradores para /dashboard/personal (solo Admin).
 * Devuelve el mismo directorio de public.personas, ya con los
 * campos legales del legajo (documento, fecha_ingreso, salario, etc.)
 * agregados por la migración de RRHH.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("personas")
    .select(PERSONA_LEGAJO_SELECT)
    .order("nombre", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, personas: data });
}
