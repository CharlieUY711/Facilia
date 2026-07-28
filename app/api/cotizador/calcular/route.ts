import { NextRequest, NextResponse } from "next/server";
import { calcularCotizacionDesdeDB, type CotizacionInput } from "@/lib/cotizador/engine";

/**
 * POST /api/cotizador/calcular
 *
 * Recibe un CotizacionInput (mismo shape que usa el motor de la
 * Etapa 2) y devuelve el resultado calculado con la configuración
 * activa de Supabase. Pensado para que etapas futuras del cotizador
 * público (components/CotizadorForm.tsx) llamen acá en vez de
 * duplicar la lógica del motor en el frontend.
 *
 * No requiere sesión: lo usa el cotizador público, igual que
 * /api/leads.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }

  if (!body || !Array.isArray(body.ambientes)) {
    return NextResponse.json(
      { ok: false, error: "Falta \"ambientes\" (array de { tipo, m2 })" },
      { status: 400 }
    );
  }
  if (typeof body.frecuencia !== "string" || !body.frecuencia) {
    return NextResponse.json({ ok: false, error: "Falta \"frecuencia\"" }, { status: 400 });
  }

  const input: CotizacionInput = {
    ambientes: body.ambientes,
    frecuencia: body.frecuencia,
    extras: Array.isArray(body.extras) ? body.extras : undefined,
  };

  try {
    const resultado = await calcularCotizacionDesdeDB(input);
    return NextResponse.json({ ok: true, resultado });
  } catch (err: any) {
    // Errores del motor (ambiente/opción/variable inexistente o inactiva,
    // superficie inválida, parámetro faltante, etc.) son errores de
    // input del cliente, no errores del servidor.
    return NextResponse.json(
      { ok: false, error: err?.message ?? "No se pudo calcular la cotización" },
      { status: 400 }
    );
  }
}
