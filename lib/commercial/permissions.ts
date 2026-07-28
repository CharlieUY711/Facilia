/**
 * FACILIA Commercial Engine — Permisos
 * ----------------------------------------------------------------
 * NO crea un sistema de permisos nuevo. Reutiliza:
 *  - lib/supabase/server.ts (mismo cliente que el resto del proyecto)
 *  - lib/roles.ts (mismo type Role de siempre)
 *  - el mismo patrón de "requireX()" ya usado en app/api/usuarios/route.ts
 *    (requireSuperAdmin() ahí es el precedente directo de este archivo).
 */

import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

interface CurrentUser {
  userId: string;
  role: Role;
}

/**
 * Sesión + rol del usuario actual, o null si no hay sesión válida.
 */
async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profile?.role) return null;
  return { userId: session.user.id, role: profile.role as Role };
}

/**
 * Exige admin o super_admin (gestión de catálogo comercial: servicios,
 * tarifas, planes). Lanza Error si no está autorizado — el caller
 * (route handler, cuando exista) decide el status code, igual que en
 * app/api/usuarios/route.ts.
 */
export async function requireAdminOSuperAdmin(): Promise<string> {
  const current = await getCurrentUser();
  if (!current || (current.role !== "admin" && current.role !== "super_admin")) {
    throw new Error("No autorizado");
  }
  return current.userId;
}

/**
 * Exige super_admin exclusivamente. Reservado para costos internos,
 * ya que exponen márgenes reales de FACILIA (ver PROJECT_AUDIT.md,
 * riesgo #6, y COMMERCIAL_ENGINE_DESIGN.md, sección 6).
 */
export async function requireSuperAdmin(): Promise<string> {
  const current = await getCurrentUser();
  if (!current || current.role !== "super_admin") {
    throw new Error("No autorizado");
  }
  return current.userId;
}
