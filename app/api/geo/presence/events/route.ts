import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeoAuth } from "@/modules/geo/presentation/api/_auth-context";
import { buildGeoContainer } from "@/modules/geo/presentation/api/_container";
import { PresenceEventMapper } from "@/modules/geo/infrastructure/mappers/PresenceEventMapper";

/**
 * GET /api/geo/presence/events?persona_id=&geofence_id=&from=&to=&page=&page_size=
 * Admin ve todos los eventos; una persona sin rol admin solo los propios
 * (consistente con la RLS de geo_presence_events, GEO-01 S8).
 */
export async function GET(req: NextRequest) {
  const auth = await getGeoAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const personaId = auth.isAdmin ? sp.get("persona_id") ?? undefined : auth.personaId ?? undefined;
  if (!auth.isAdmin && !personaId) return NextResponse.json({ ok: true, items: [], total: 0 });

  const supabase = createClient();
  const { repositories } = buildGeoContainer(supabase);

  const { items, total } = await repositories.presenceEventRepository.findMany({
    personaId,
    geofenceId: sp.get("geofence_id") ?? undefined,
    from: sp.get("from") ? new Date(sp.get("from")!) : undefined,
    to: sp.get("to") ? new Date(sp.get("to")!) : undefined,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
    pageSize: sp.get("page_size") ? Number(sp.get("page_size")) : undefined,
  });

  return NextResponse.json({ ok: true, items: items.map((e) => PresenceEventMapper.toDTO(e)), total });
}
