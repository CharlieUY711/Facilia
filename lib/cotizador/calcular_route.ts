import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calcularCotizacionDesdeDB, type CotizacionInput } from "@/lib/cotizador/engine";

/**
 * POST /api/cotizador/calcular
 *
 * Recibe un CotizacionInput (mismo shape que consume el motor de
 * lib/cotizador/engine.ts, Etapas 5D-bis/5G/5J) y devuelve el resultado
 * calculado con la configuración activa de Supabase. Pensado para que
 * etapas futuras del cotizador público (components/CotizadorForm.tsx)
 * llamen acá en vez de duplicar la lógica del motor en el frontend.
 *
 * No requiere sesión: lo usa el cotizador público, igual que /api/leads.
 */
const ambienteSchema = z.object({
  tipo: z.string().min(1),
  m2: z.number().positive(),
});

const opcionalSeleccionadoSchema = z.object({
  variable_codigo: z.string().min(1),
  opcion_codigo: z.string().min(1),
  cantidad: z.number().positive().optional(),
});

const schema = z.object({
  ambientes: z.array(ambienteSchema).min(1, "Agregá al menos un ambiente"),
  frecuencia: z.string().min(1),
  extras: z.array(z.string().min(1)).optional(),
  opcionales: z.array(opcionalSeleccionadoSchema).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Body inválido" },
      { status: 400 }
    );
  }

  const input: CotizacionInput = {
    ambientes: parsed.data.ambientes,
    frecuencia: parsed.data.frecuencia,
    extras: parsed.data.extras,
    opcionales: parsed.data.opcionales,
  };

  try {
    const resultado = await calcularCotizacionDesdeDB(input);
    return NextResponse.json({ ok: true, resultado });
  } catch (err: any) {
    // Errores del motor (ambiente/opción/variable inexistente o inactiva,
    // superficie inválida, parámetro faltante o cantidad fuera de rango,
    // etc.) son errores de input del cliente, no errores del servidor.
    return NextResponse.json(
      { ok: false, error: err?.message ?? "No se pudo calcular la cotización" },
      { status: 400 }
    );
  }
}
