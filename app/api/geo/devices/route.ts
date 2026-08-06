import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeoAuth } from "@/modules/geo/presentation/api/_auth-context";
import { buildGeoContainer } from "@/modules/geo/presentation/api/_container";
import { DeviceMapper } from "@/modules/geo/infrastructure/mappers/DeviceMapper";

/**
 * GET /api/geo/devices?persona_id=&status=&page=&page_size=
 * Admin ve todos los dispositivos (filtrables). Una persona sin rol admin
 * solo ve los suyos, sin importar el query param persona_id que envie.
 */
export async function GET(req: NextRequest) {
  const auth = await getGeoAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const supabase = createClient();
  const { repositories } = buildGeoContainer(supabase);

  const personaId = auth.isAdmin ? sp.get("persona_id") ?? undefined : auth.personaId ?? undefined;
  if (!auth.isAdmin && !personaId) {
    return NextResponse.json({ ok: true, items: [], total: 0 });
  }

  const { items, total } = await repositories.deviceRepository.findMany({
    personaId,
    status: sp.get("status") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
    pageSize: sp.get("page_size") ? Number(sp.get("page_size")) : undefined,
  });

  return NextResponse.json({ ok: true, items: items.map((d) => DeviceMapper.toDTO(d)), total });
}

/**
 * POST /api/geo/devices
 * Body: { personaId?, deviceIdentifier, label?, modelo?, sistemaOperativo?, navegador?, appVersion? }
 * Una persona no-admin solo puede registrar un dispositivo para si misma
 * (se ignora personaId del body y se usa el propio). Un admin puede
 * registrar a nombre de cualquier persona trackeable.
 */
export async function POST(req: NextRequest) {
  const auth = await getGeoAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.deviceIdentifier) {
    return NextResponse.json({ ok: false, error: "deviceIdentifier es requerido" }, { status: 400 });
  }

  const personaId = auth.isAdmin && body.personaId ? body.personaId : auth.personaId;
  if (!personaId) {
    return NextResponse.json({ ok: false, error: "No hay una persona asociada a este usuario" }, { status: 400 });
  }

  const supabase = createClient();
  const { devices } = buildGeoContainer(supabase);

  try {
    const device = await devices.registerDevice.execute({
      personaId,
      deviceIdentifier: body.deviceIdentifier,
      label: body.label ?? null,
      modelo: body.modelo ?? null,
      sistemaOperativo: body.sistemaOperativo ?? null,
      navegador: body.navegador ?? null,
      appVersion: body.appVersion ?? null,
      requestedBy: auth.uid,
    });
    return NextResponse.json({ ok: true, device });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al registrar dispositivo";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
