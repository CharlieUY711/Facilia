import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getGeoAuth } from "@/modules/geo/presentation/api/_auth-context";
import { buildGeoContainer } from "@/modules/geo/presentation/api/_container";
import { LocationRecordMapper } from "@/modules/geo/infrastructure/mappers/LocationRecordMapper";

/**
 * POST /api/geo/locations
 * Body: { trackingSessionId, deviceId, latitude, longitude, accuracy, altitude?, speed?, recordedAt }
 * Endpoint consumido por la PWA (GEO-04). Usa Service Role para la
 * escritura de alta frecuencia (decision GEO-00 S11) — la sesion de
 * cookies solo se usa para AUTENTICAR quien hace la request (getGeoAuth);
 * la propiedad de la sesion de tracking se valida en la capa de
 * aplicacion (RecordLocation), no en RLS, para este endpoint puntual.
 * Encadena DetectPresence (version basica GEO-02) sobre el registro recien
 * creado.
 */
export async function POST(req: NextRequest) {
  const auth = await getGeoAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  if (!auth.personaId) {
    return NextResponse.json({ ok: false, error: "No hay una persona asociada a este usuario" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const required = ["trackingSessionId", "deviceId", "latitude", "longitude", "accuracy", "recordedAt"];
  if (!body || required.some((key) => body[key] === undefined || body[key] === null)) {
    return NextResponse.json({ ok: false, error: `Campos requeridos: ${required.join(", ")}` }, { status: 400 });
  }

  const service = createServiceClient();
  const { locations, presence } = buildGeoContainer(service);

  try {
    const location = await locations.recordLocation.execute({
      trackingSessionId: body.trackingSessionId,
      deviceId: body.deviceId,
      personaId: auth.personaId,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy,
      altitude: body.altitude ?? null,
      speed: body.speed ?? null,
      recordedAt: body.recordedAt,
    });

    const presenceEvents = await presence.detectPresence.execute({ locationRecordId: location.id });

    return NextResponse.json({ ok: true, location, presenceEvents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al registrar posicion";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

/**
 * GET /api/geo/locations?persona_id=&device_id=&tracking_session_id=&from=&to=&page=&page_size=
 * Historico. RLS restringe: Admin ve todo, una persona solo lo propio.
 */
export async function GET(req: NextRequest) {
  const auth = await getGeoAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const supabase = createClient();
  const { repositories } = buildGeoContainer(supabase);

  const personaId = auth.isAdmin ? sp.get("persona_id") ?? undefined : auth.personaId ?? undefined;
  if (!auth.isAdmin && !personaId) return NextResponse.json({ ok: true, items: [], total: 0 });

  const { items, total } = await repositories.locationRepository.findHistory({
    personaId,
    deviceId: sp.get("device_id") ?? undefined,
    trackingSessionId: sp.get("tracking_session_id") ?? undefined,
    from: sp.get("from") ? new Date(sp.get("from")!) : undefined,
    to: sp.get("to") ? new Date(sp.get("to")!) : undefined,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
    pageSize: sp.get("page_size") ? Number(sp.get("page_size")) : undefined,
  });

  return NextResponse.json({ ok: true, items: items.map((r) => LocationRecordMapper.toDTO(r)), total });
}
