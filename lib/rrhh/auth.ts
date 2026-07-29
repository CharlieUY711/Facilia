import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/serverAuth";
import type { Role } from "@/lib/roles";

export interface RrhhAuth {
  uid: string;
  role: Role;
  isAdmin: boolean;
  /** id de public.personas cuyo profile_id === uid, o null si esa
   * persona todavía no existe / no está vinculada. */
  personaId: string | null;
}

/**
 * Autenticación compartida por todas las API routes de /api/rrhh.
 * Devuelve el uid, el rol, si es Admin/Super Admin, y el id de la
 * Persona propia (si existe) para poder resolver "es dueño de este
 * legajo o es Admin" en cada route.
 */
export async function getRrhhAuth(): Promise<RrhhAuth | null> {
  const auth = await requireAuth();
  if (!auth) return null;

  const isAdmin = auth.role === "super_admin" || auth.role === "admin";

  const service = createServiceClient();
  const { data: persona } = await service
    .from("personas")
    .select("id")
    .eq("profile_id", auth.uid)
    .maybeSingle();

  return { uid: auth.uid, role: auth.role, isAdmin, personaId: persona?.id ?? null };
}

/** true si el usuario autenticado es Admin/Super Admin, o si el legajo
 * consultado (personaId) es el suyo propio. */
export function puedeVerLegajo(auth: RrhhAuth, personaId: string): boolean {
  return auth.isAdmin || auth.personaId === personaId;
}
