import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para uso en componentes de cliente ("use client").
 * Usa la anon key — segura para exponer en el browser porque el acceso
 * real a los datos está gobernado por Row Level Security (ver supabase/schema.sql).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
