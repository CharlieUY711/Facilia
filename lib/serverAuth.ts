import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

/**
 * Verifica que quien hace la request esté logueado y sea Super Admin o
 * Administrador — los únicos roles que pueden gestionar el directorio
 * (Organizaciones, Locaciones, Personas y roles de acceso).
 * Devuelve { uid, role } o null si no está autorizado.
 */
export async function requireAdmin(): Promise<{ uid: string; role: Role } | null> {
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

  if (profile?.role !== "super_admin" && profile?.role !== "admin") return null;
  return { uid: session.user.id, role: profile.role as Role };
}

/**
 * Verifica solamente que quien hace la request esté logueado, sin
 * importar el rol. Se usa en el módulo de Personal (RRHH): un
 * colaborador con rol "personal" necesita poder leer/actuar sobre su
 * propio legajo aunque no sea Admin — el chequeo de "es su propio
 * legajo o es Admin" lo hace cada API route con el uid/role que
 * devuelve esta función (ver lib/rrhh/auth.ts).
 * Devuelve { uid, role } o null si no hay sesión.
 */
export async function requireAuth(): Promise<{ uid: string; role: Role } | null> {
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

  if (!profile) return null;
  return { uid: session.user.id, role: profile.role as Role };
}

/**
 * Verifica que quien hace la request sea específicamente Super Admin.
 * Se usa para acciones sensibles que ni siquiera Administrador puede
 * hacer (otorgar/quitar el rol super_admin).
 */
export async function requireSuperAdmin(): Promise<string | null> {
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

  if (profile?.role !== "super_admin") return null;
  return session.user.id;
}
