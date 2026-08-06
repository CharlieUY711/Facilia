import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeoAuth } from "@/modules/geo/presentation/api/_auth-context";
import { buildGeoContainer } from "@/modules/geo/presentation/api/_container";
import { GeofenceMapper } from "@/modules/geo/infrastructure/mappers/GeofenceMapper";

/**
 * GET /api/geo/geofences?type=&status=&external_location_id=&page=&page_size=
 * POST /api/geo/geofences  Body: { name, type, externalLocationId?, latitude, longitude, radiusMeters }
 * Gestion de geocercas: exclusiva de Admin/Super Admin (GEO-00 S9 — el
 * dispositivo movil no lee geocercas directamente, GEO-04).
 */
export async function GET(req: NextRequest) {
  const auth = await getGeoAuth();
  if (!auth?.isAdmin) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const supabase = createClient();
  const { repositories } = buildGeoContainer(supabase);

  const { items, total } = await repositories.geofenceRepository.findMany({
    type: sp.get("type") ?? undefined,
    status: sp.get("status") ?? undefined,
    externalLocationId: sp.get("external_location_id") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
    pageSize: sp.get("page_size") ? Number(sp.get("page_size")) : undefined,
  });

  return NextResponse.json({ ok: true, items: items.map((g) => GeofenceMapper.toDTO(g)), total });
}

export async function POST(req: NextRequest) {
  const auth = await getGeoAuth();
  if (!auth?.isAdmin) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const required = ["name", "type", "latitude", "longitude", "radiusMeters"];
  if (!body || required.some((key) => body[key] === undefined || body[key] === null)) {
    return NextResponse.json({ ok: false, error: `Campos requeridos: ${required.join(", ")}` }, { status: 400 });
  }

  const supabase = createClient();
  const { geofences } = buildGeoContainer(supabase);

  try {
    const geofence = await geofences.createGeofence.execute({
      name: body.name,
      type: body.type,
      externalLocationId: body.externalLocationId ?? null,
      latitude: body.latitude,
      longitude: body.longitude,
      radiusMeters: body.radiusMeters,
      requestedBy: auth.uid,
    });
    return NextResponse.json({ ok: true, geofence });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al crear geocerca";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
