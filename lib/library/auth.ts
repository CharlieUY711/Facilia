import { requireAuth } from "@/lib/serverAuth";
import type { Role } from "@/lib/roles";
import type { RepositoryType } from "./types";

export interface LibraryAuth {
  uid: string;
  role: Role;
  /** super_admin o admin */
  isAdmin: boolean;
  /** super_admin, admin o colaborador */
  isStaff: boolean;
}

/**
 * Autenticación compartida por todas las API routes de /api/library.
 * Devuelve null si no hay sesión o si el rol no tiene ningún acceso
 * al módulo (roles "personal" y "usuario" quedan afuera en esta
 * etapa — ver notas de la migración 2026_07_29_library_modulo.sql).
 */
export async function getLibraryAuth(): Promise<LibraryAuth | null> {
  const auth = await requireAuth();
  if (!auth) return null;

  const isAdmin = auth.role === "super_admin" || auth.role === "admin";
  const isStaff = isAdmin || auth.role === "colaborador";
  if (!isStaff) return null;

  return { uid: auth.uid, role: auth.role, isAdmin, isStaff };
}

/** true si el usuario puede leer un recurso del repositorio dado. */
export function puedeVerRepositorio(auth: LibraryAuth, repositoryType: RepositoryType): boolean {
  return repositoryType === "publica" ? auth.isStaff : auth.isAdmin;
}

/** true si el usuario puede crear/editar/borrar en el repositorio dado. */
export function puedeEscribirRepositorio(auth: LibraryAuth, repositoryType: RepositoryType): boolean {
  return puedeVerRepositorio(auth, repositoryType);
}
