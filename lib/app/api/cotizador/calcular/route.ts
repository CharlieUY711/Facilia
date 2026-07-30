import { NextRequest, NextResponse } from "next/server";
import { calcularCotizacionDesdeDB, type CotizacionInput } from "@/lib/cotizador/engine";

/**
 * POST /api/cotizador/calcular
 * Body: CotizacionInput — {
 *   ambientes: {tipo, m2}[],
 *   frecuencia,
 *   extras?: string[],
 *   opcionales?: { variable_codigo, opcion_codigo, cantidad? }[]  // Etapa 5G
 * }
 *
 * Corre el motor nuevo (lib/cotizador/engine.ts) contra la configuración
 * viva en Supabase. Pública (sin requireAdmin): la va a usar el cotizador
 * público cuando se migre en una etapa futura. Por ahora no la consume
 * nadie todavía — sirve para probar el motor end-to-end vía HTTP mientras
 * tanto.
 */
export async function POST(req: NextRequest) {
  let body: CotizacionInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido, se esperaba JSON" }, { status: 400 });
  }

  if (!body || !Array.isArray(body.ambientes) || !body.frecuencia) {
    return NextResponse.json(
      { ok: false, error: "Body inválido. Se espera { ambientes: [{tipo, m2}], frecuencia, extras?, opcionales? }" },
      { status: 400 }
    );
  }

  try {
    const resultado = await calcularCotizacionDesdeDB(body);
    return NextResponse.json({ ok: true, resultado });
  } catch (err: any) {
    // Errores del motor (opción/variable inexistente, superficie inválida,
    // parámetro faltante) son errores de input del usuario, no del server.
    return NextResponse.json({ ok: false, error: err?.message ?? "Error al calcular la cotización" }, { status: 400 });
  }
}
