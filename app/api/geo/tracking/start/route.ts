import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeoAuth } from "@/modules/geo/presentation/api/_auth-context";
import { buildGeoContainer } from "@/modules/geo/presentation/api/_container";

/**
 * POST /api/geo/tracking/start
 * Body: { deviceId }
 * Siempre inicia una jornada para la propia persona autenticada (GEO-04:
 * "Comenzar jornada"). No admite iniciar tracking a nombre de otra persona.
 */
export async function POST(req: NextRequest) {
  const auth = await getGeoAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  if (!auth.personaId || !auth.isTrackable) {
    return NextResponse.json({ ok: false, error: "Esta cuenta no puede iniciar seguimiento" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.deviceId) {
    return NextResponse.json({ ok: false, error: "deviceId es requerido" }, { status: 400 });
  }

  const supabase = createClient();
  const { tracking } = buildGeoContainer(supabase);

  try {
    const session = await tracking.startTrackingSession.execute({
      personaId: auth.personaId,
      deviceId: body.deviceId,
    });
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al iniciar seguimiento";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
