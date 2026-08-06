import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeoAuth } from "@/modules/geo/presentation/api/_auth-context";
import { buildGeoContainer } from "@/modules/geo/presentation/api/_container";
import { PresenceEventMapper } from "@/modules/geo/infrastructure/mappers/PresenceEventMapper";

/**
 * GET /api/geo/presence/current?persona_id=&geofence_id=
 * "Presencia actual": el ultimo evento de presencia registrado. Si viene
 * geofence_id, se acota a esa geocerca (usa el indice dedicado). Sin
 * geofence_id, se toma el mas reciente entre todas. Interpretar: si
 * type === 'ENTER' | 'STAY', la persona esta dentro; si 'EXIT', esta
 * fuera. La maquina de estados completa (ENTERING/LEAVING) es GEO-05.
 */
export async function GET(req: NextRequest) {
  const auth = await getGeoAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const personaId = auth.isAdmin ? sp.get("persona_id") ?? undefined : auth.personaId ?? undefined;
  if (!personaId) return NextResponse.json({ ok: false, error: "persona_id es requerido" }, { status: 400 });

  const supabase = createClient();
  const { repositories } = buildGeoContainer(supabase);
  const geofenceId = sp.get("geofence_id");

  const lastEvent = geofenceId
    ? await repositories.presenceEventRepository.findLastByPersonaAndGeofence(personaId, geofenceId)
    : (await repositories.presenceEventRepository.findMany({ personaId, pageSize: 1 })).items[0] ?? null;

  return NextResponse.json({ ok: true, current: lastEvent ? PresenceEventMapper.toDTO(lastEvent) : null });
}
