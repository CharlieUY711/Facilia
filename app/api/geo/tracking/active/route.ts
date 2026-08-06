import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeoAuth } from "@/modules/geo/presentation/api/_auth-context";
import { buildGeoContainer } from "@/modules/geo/presentation/api/_container";
import { TrackingSessionMapper } from "@/modules/geo/infrastructure/mappers/TrackingSessionMapper";

/**
 * GET /api/geo/tracking/active?persona_id=
 * Sin persona_id: devuelve la sesion activa propia (o null). Con
 * persona_id: solo Admin puede consultar la de otra persona.
 */
export async function GET(req: NextRequest) {
  const auth = await getGeoAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const requestedPersonaId = sp.get("persona_id");
  const personaId = requestedPersonaId && auth.isAdmin ? requestedPersonaId : auth.personaId;
  if (!personaId) return NextResponse.json({ ok: true, session: null });

  const supabase = createClient();
  const { repositories } = buildGeoContainer(supabase);
  const session = await repositories.trackingSessionRepository.findActiveByPersonaId(personaId);

  return NextResponse.json({ ok: true, session: session ? TrackingSessionMapper.toDTO(session) : null });
}
