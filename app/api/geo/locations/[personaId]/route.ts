import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeoAuth, puedeVerRecursoDePersona } from "@/modules/geo/presentation/api/_auth-context";
import { buildGeoContainer } from "@/modules/geo/presentation/api/_container";
import { LocationRecordMapper } from "@/modules/geo/infrastructure/mappers/LocationRecordMapper";

/**
 * GET /api/geo/locations/{persona_id}
 * Ultima posicion conocida de una persona (usado por GEO-06, panel
 * supervisor). Admin o la propia persona.
 */
export async function GET(_req: NextRequest, { params }: { params: { personaId: string } }) {
  const auth = await getGeoAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  if (!puedeVerRecursoDePersona(auth, params.personaId)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const supabase = createClient();
  const { repositories } = buildGeoContainer(supabase);
  const last = await repositories.locationRepository.findLastByPersonaId(params.personaId);

  return NextResponse.json({ ok: true, location: last ? LocationRecordMapper.toDTO(last) : null });
}
