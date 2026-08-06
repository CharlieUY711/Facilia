import { requireAuth } from "@/lib/serverAuth";
import type { Role } from "@/lib/roles";

export interface ComAuth {
  uid: string;
  role: Role;
  /** super_admin, admin o colaborador — igual que is_admin_or_colaborador() en RLS. */
  isStaff: boolean;
}

/**
 * Autenticación compartida por todas las API routes de /api/com
 * (excepto el webhook de Twilio, que no tiene sesión de usuario y se
 * autentica con la firma HMAC — ver app/api/com/webhooks/twilio/route.ts).
 *
 * El staff (admin/colaborador/super_admin) es quien opera COM — el
 * personal operativo (rol "personal") participa de las conversaciones
 * pero a través de WhatsApp, no logueándose en el panel. Mismo criterio
 * de acceso que ya usa Library (ver lib/library/auth.ts).
 */
export async function getComAuth(): Promise<ComAuth | null> {
  const auth = await requireAuth();
  if (!auth) return null;

  const isStaff = auth.role === "super_admin" || auth.role === "admin" || auth.role === "colaborador";
  if (!isStaff) return null;

  return { uid: auth.uid, role: auth.role, isStaff };
}
