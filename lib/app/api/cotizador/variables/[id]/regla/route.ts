import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const FUENTES_VALIDAS = ["constante", "m2_total", "personas", "conteo_tipo_ambiente", "cantidad_variable"];

interface TerminoBody {
  orden?: number;
  fuente: string;
  tipo_ambiente?: string | null;
  variable_referencia_id?: string | null;
  constante?: number;
  multiplicador?: number;
}

/**
 * GET /api/cotizador/variables/:id/regla
 * Lista los términos de la regla de cantidad de una variable (motor de
 * reglas — ver 2026_07_30_cotizador_reglas_cantidad.sql). El listado
 * general de variables (GET /api/cotizador/variables) ya los trae
 * anidados; este endpoint es sobre todo para refrescar un solo builder
 * después de guardar sin recargar todo el panel.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("cotizador_regla_terminos")
    .select("*")
    .eq("variable_id", params.id)
    .order("orden", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, terminos: data });
}

/**
 * PUT /api/cotizador/variables/:id/regla
 * Body: { terminos: TerminoBody[] }
 * Reemplaza TODA la regla de la variable de una — borra los términos
 * existentes y crea los nuevos. Se hace así (en vez de un diff
 * PATCH/POST/DELETE por término) porque el builder del panel siempre
 * manda la lista completa; es más simple y evita estados intermedios
 * inconsistentes a mitad de edición.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const terminos: TerminoBody[] = Array.isArray(body.terminos) ? body.terminos : [];

  for (const [i, t] of terminos.entries()) {
    if (!FUENTES_VALIDAS.includes(t.fuente)) {
      return NextResponse.json(
        { ok: false, error: `Término #${i + 1}: fuente inválida "${t.fuente}". Debe ser una de: ${FUENTES_VALIDAS.join(", ")}` },
        { status: 400 }
      );
    }
    if (t.fuente === "conteo_tipo_ambiente" && !t.tipo_ambiente) {
      return NextResponse.json(
        { ok: false, error: `Término #${i + 1}: falta elegir el tipo de ambiente` },
        { status: 400 }
      );
    }
    if (t.fuente === "cantidad_variable") {
      if (!t.variable_referencia_id) {
        return NextResponse.json(
          { ok: false, error: `Término #${i + 1}: falta elegir a qué opcional hace referencia` },
          { status: 400 }
        );
      }
      if (t.variable_referencia_id === params.id) {
        return NextResponse.json(
          { ok: false, error: `Término #${i + 1}: una regla no puede referenciar su propia variable` },
          { status: 400 }
        );
      }
    }
  }

  const supabase = createServiceClient();

  const { error: errorDelete } = await supabase.from("cotizador_regla_terminos").delete().eq("variable_id", params.id);
  if (errorDelete) {
    return NextResponse.json({ ok: false, error: errorDelete.message }, { status: 500 });
  }

  if (terminos.length === 0) {
    return NextResponse.json({ ok: true, terminos: [] });
  }

  const filas = terminos.map((t, i) => ({
    variable_id: params.id,
    orden: t.orden ?? i,
    fuente: t.fuente,
    tipo_ambiente: t.fuente === "conteo_tipo_ambiente" ? t.tipo_ambiente : null,
    variable_referencia_id: t.fuente === "cantidad_variable" ? t.variable_referencia_id : null,
    constante: t.fuente === "constante" ? t.constante ?? 1 : 1,
    multiplicador: t.multiplicador ?? 1,
    actualizado_en: new Date().toISOString(),
    actualizado_por: auth.uid,
  }));

  const { data, error } = await supabase.from("cotizador_regla_terminos").insert(filas).select();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, terminos: data });
}
