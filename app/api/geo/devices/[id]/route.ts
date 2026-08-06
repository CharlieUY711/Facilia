import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeoAuth } from "@/modules/geo/presentation/api/_auth-context";
import { buildGeoContainer } from "@/modules/geo/presentation/api/_container";

/**
 * PATCH /api/geo/devices/{id}
 * Body: { status: "ACTIVE" | "INACTIVE" | "LOST" | "BLOCKED" | "RETIRED" }
 * Solo Admin/Super Admin puede cambiar el estado administrativo de un
 * dispositivo (GEO-00 S9).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getGeoAuth();
  if (!auth?.isAdmin) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.status) {
    return NextResponse.json({ ok: false, error: "status es requerido" }, { status: 400 });
  }

  const supabase = createClient();
  const { devices } = buildGeoContainer(supabase);

  try {
    const device = await devices.updateDeviceStatus.execute({
      deviceId: params.id,
      status: body.status,
      requestedBy: auth.uid,
    });
    return NextResponse.json({ ok: true, device });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al actualizar dispositivo";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
