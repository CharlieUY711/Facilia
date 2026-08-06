import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeoAuth } from "@/modules/geo/presentation/api/_auth-context";
import { buildGeoContainer } from "@/modules/geo/presentation/api/_container";

/**
 * PATCH /api/geo/geofences/{id}
 * Body: { name?, latitude?, longitude?, radiusMeters?, status? }
 * Admin/Super Admin. Si viene `status`, se aplica ademas de (u en vez de)
 * los cambios de geometria/nombre.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getGeoAuth();
  if (!auth?.isAdmin) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Body invalido" }, { status: 400 });

  const supabase = createClient();
  const { geofences } = buildGeoContainer(supabase);

  try {
    let geofence = null;

    const hasGeometryOrNameChange =
      body.name !== undefined || body.latitude !== undefined || body.longitude !== undefined || body.radiusMeters !== undefined;

    if (hasGeometryOrNameChange) {
      geofence = await geofences.updateGeofence.execute({
        geofenceId: params.id,
        name: body.name,
        latitude: body.latitude,
        longitude: body.longitude,
        radiusMeters: body.radiusMeters,
        requestedBy: auth.uid,
      });
    }

    if (body.status !== undefined) {
      geofence = await geofences.setGeofenceStatus.execute({
        geofenceId: params.id,
        status: body.status,
        requestedBy: auth.uid,
      });
    }

    if (!geofence) {
      return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, geofence });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al actualizar geocerca";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
