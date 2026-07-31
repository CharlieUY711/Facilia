import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Mismo motivo que en app/api/cotizador/formulario/route.ts: GET sin
// cookies/headers/params se trata como estático por default y queda
// congelado hasta el próximo deploy.
export const dynamic = "force-dynamic";

/**
 * GET /api/cotizador/config
 *
 * Devuelve la configuración dinámica del cotizador:
 * - Variables
 * - Opciones
 * - Factores
 */

export async function GET() {

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_variables")
    .select(`
      *,
      cotizador_opciones(*)
    `)
    .eq("activo", true)
    .order("orden", { ascending: true });


  if (error) {
    console.error("Error obteniendo configuración cotizador:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }


  return NextResponse.json({
    ok: true,
    variables: data
  });

}
