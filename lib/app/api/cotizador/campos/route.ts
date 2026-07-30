import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_INPUT_VALIDOS = ["select", "number", "text", "boolean", "select_repetible"];

/**
 * GET /api/cotizador/campos
 * Todos los campos (de todos los pasos, activos e inactivos). Lo usa el
 * panel admin. Query opcional: ?paso_id=<uuid> para filtrar por paso.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const supabase = createServiceClient();
  const pasoId = req.nextUrl.searchParams.get("paso_id");

  let query = supabase.from("cotizador_campos").select("*").order("orden", { ascending: true });
  if (pasoId) query = query.eq("paso_id", pasoId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, campos: data });
}

/**
 * POST /api/cotizador/campos
 * Body: { paso_id, nombre, codigo, tipo_input, variable_id?, opciones?,
 *         obligatorio?, orden? }
 *
 * Si variable_id está seteado, sus opciones deben salir de
 * cotizador_opciones (resuelto en GET /api/cotizador/formulario), así que
 * lo normal es NO mandar `opciones` en ese caso. Si variable_id no está
 * seteado, `opciones` es el array/objeto propio del campo (ver el shape
 * especial de "filas" para tipo_input=select_repetible, documentado en el
 * seed de la Etapa 5B, supabase/schema.sql).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  const nombre = (body.nombre ?? "").trim();
  const codigo = (body.codigo ?? "").trim();
  const tipo_input = body.tipo_input ?? "select";

  if (!body.paso_id) return NextResponse.json({ ok: false, error: "paso_id es obligatorio" }, { status: 400 });
  if (!nombre) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  if (!codigo) return NextResponse.json({ ok: false, error: "El código es obligatorio" }, { status: 400 });
  if (!TIPOS_INPUT_VALIDOS.includes(tipo_input)) {
    return NextResponse.json(
      { ok: false, error: `tipo_input inválido. Debe ser uno de: ${TIPOS_INPUT_VALIDOS.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_campos")
    .insert({
      paso_id: body.paso_id,
      variable_id: body.variable_id ?? null,
      nombre,
      codigo,
      tipo_input,
      opciones: body.opciones ?? null,
      obligatorio: body.obligatorio ?? false,
      orden: body.orden ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: `Ese paso ya tiene un campo con el código "${codigo}"` }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, campo: data });
}
