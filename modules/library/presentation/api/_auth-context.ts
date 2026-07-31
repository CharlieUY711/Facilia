import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server"; // helper estandar existente en FACILIA

export interface RequestContext {
  organizationId: string;
  userId: string;
}

/**
 * Extrae organizacion y usuario autenticado desde la sesion de Supabase.
 * Reutiliza el helper estandar de FACILIA para el cliente de servidor.
 */
export async function getRequestContext(_req: NextRequest): Promise<RequestContext> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("No autenticado");
  }
  const organizationId = data.user.user_metadata?.organization_id;
  if (!organizationId) {
    throw new Error("El usuario no tiene organizacion asociada");
  }
  return { organizationId, userId: data.user.id };
}

export { createServerSupabaseClient };
