import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculatePrice } from "@/lib/calculatePrice";

const TIPO_AMBIENTE = z.enum([
  "oficina",
  "bano",
  "cocina",
  "sala_reuniones",
  "auditorio",
  "espacios_comunes",
  "barbacoa",
]);

const schema = z.object({
  ambientes: z
    .array(
      z.object({
        tipo_ambiente: TIPO_AMBIENTE,
        m2: z.number().positive(),
        usuarios: z.number().nonnegative().optional(),
        luz_natural: z.boolean().optional(),
        ventana: z.boolean().optional(),
      })
    )
    .min(1, "Agregá al menos un ambiente"),
  frecuencia: z.enum(["1x_semana", "2x_semana", "3x_semana", "5x_semana", "diario"]),
  estructura: z
    .object({
      tipo_espacio: z.string().optional(),
      plantas: z.string().optional(),
      subsuelos: z.string().optional(),
      barbacoa_personas: z.string().optional(),
      turnos: z.string().optional(),
      horario: z.string().optional(),
      usuarios_totales: z.string().optional(),
    })
    .optional(),
  opcionales: z
    .object({
      vajilla: z
        .object({
          tipo: z.enum(["estandar", "premium", "personalizada"]),
          cantidad: z.number().positive(),
          plazo: z.enum(["semana", "mes", "trimestre", "semestre", "anio", "contrato"]).optional(),
        })
        .optional(),
      vajilla_sanitizacion_semanal: z.boolean().optional(),
      lavavajillas: z
        .object({
          tipo: z.enum(["de_mesas", "de_piso"]),
        })
        .optional(),
      cafetera: z.enum(["capsulas", "espresso", "filtro"]).optional(),
      dispensador_agua: z.enum(["frio_caliente", "con_filtro", "osmosis", "compacto"]).optional(),
      ambientadores: z
        .object({
          cantidad: z.number().min(1).max(12),
        })
        .optional(),
      insumos_cocina_bano: z
        .record(
          z.enum(["detergente", "toallas_papel", "jabon_liquido", "papel_higienico"]),
          z.object({
            nivel: z.enum(["estandar", "premium", "ultra_premium"]),
            incluir_dispensador: z.boolean().optional(),
          })
        )
        .optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = schema.parse(body);
    const cotizacion = calculatePrice(input as any);
    return NextResponse.json({ ok: true, cotizacion });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error al calcular el presupuesto" },
      { status: 400 }
    );
  }
}
