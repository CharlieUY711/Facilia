import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeoAuth } from "@/modules/geo/presentation/api/_auth-context";
import { buildGeoContainer } from "@/modules/geo/presentation/api/_container";

/**
 * POST /api/geo/tracking/end
 * Body: { trackingSessionId }
 * Finaliza la jornada propia (GEO-04: "Finalizar jornada").
 */
export async function POST(req: NextRequest) {
  const auth = await getGeoAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  if (!auth.personaId) {
    return NextResponse.json({ ok: false, error: "No hay una persona asociada a este usuario" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.trackingSessionId) {
    return NextResponse.json({ ok: false, error: "trackingSessionId es requerido" }, { status: 400 });
  }

  const supabase = createClient();
  const { tracking } = buildGeoContainer(supabase);

  try {
    const session = await tracking.endTrackingSession.execute({
      trackingSessionId: body.trackingSessionId,
      personaId: auth.personaId,
    });
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al finalizar seguimiento";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
