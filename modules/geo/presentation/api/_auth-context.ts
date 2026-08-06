import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/serverAuth";
import type { Role } from "@/lib/roles";

export interface GeoAuth {
  uid: string;
  role: Role;
  isAdmin: boolean;
  /** id de public.personas cuyo profile_id === uid, o null si no existe. */
  personaId: string | null;
  /** true si ademas es personal_facilia activo (puede iniciar tracking). */
  isTrackable: boolean;
}

/**
 * Autenticacion compartida por todas las API routes de /api/geo. Calca el
 * patron real y ya probado de lib/rrhh/auth.ts (getRrhhAuth) — NO el
 * patron roto de modules/library/presentation/api/_auth-context.ts, que
 * referencia un helper (`createServerSupabaseClient`) y un claim
 * (`user_metadata.organization_id`) que no existen en este repositorio
 * (ver GEO-00 S0).
 */
export async function getGeoAuth(): Promise<GeoAuth | null> {
  const auth = await requireAuth();
  if (!auth) return null;

  const isAdmin = auth.role === "super_admin" || auth.role === "admin";

  const service = createServiceClient();
  const { data: persona } = await service
    .from("personas")
    .select("id, tipo, estado_laboral")
    .eq("profile_id", auth.uid)
    .maybeSingle();

  const isTrackable = Boolean(
    persona && persona.tipo === "personal_facilia" && persona.estado_laboral === "activo"
  );

  return { uid: auth.uid, role: auth.role, isAdmin, personaId: persona?.id ?? null, isTrackable };
}

/** Admin ve/gestiona todo, o el dato pertenece a la propia persona. */
export function puedeVerRecursoDePersona(auth: GeoAuth, personaId: string): boolean {
  return auth.isAdmin || auth.personaId === personaId;
}
