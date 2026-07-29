import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_VALIDOS = ["select", "select_repetible", "select_cantidad", "number", "boolean", "text", "formula"];
const CANTIDAD_FUENTES_VALIDAS = ["ninguna", "input_cliente", "cantidad_banos"];

/**
 * GET /api/cotizador/variables
 * Todas las variables (activas e inactivas) con sus opciones anidadas —
 * lo usa el panel admin. El cotizador público usa /api/cotizador/config
 * (solo variables activas).
 */
export async function GET() {

 const supabase=createServiceClient();

 const {data,error}=await supabase
 .from("cotizador_variables")
 .select(`
   *,
   cotizador_opciones(*)
 `)
 .order("orden");

 if(error){
   return NextResponse.json(
    {ok:false,error:error.message},
    {status:500}
   );
 }

 return NextResponse.json({
   ok:true,
   variables:data
 });

}

/**
 * POST /api/cotizador/variables
 * Body: { nombre, codigo, tipo, orden?, obligatorio?, afecta_precio?, descripcion?,
 *         cantidad_fuente?, unidad_cantidad?, cantidad_min?, cantidad_max? }
 * Crea una variable nueva. Solo Super Admin / Admin.
 *
 * Los 4 campos de cantidad (Etapa 5G) solo tienen sentido para variables de
 * opcionales (vajilla, ambientadores, insumos de cocina/baño, etc.):
 * cantidad_fuente 'input_cliente' espera unidad_cantidad/cantidad_min/max;
 * 'cantidad_banos' y 'ninguna' los ignoran. Ver lib/cotizador/engine.ts.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  const nombre = (body.nombre ?? "").trim();
  const codigo = (body.codigo ?? "").trim();
  const tipo = body.tipo ?? "select";
  const cantidadFuente = body.cantidad_fuente ?? "ninguna";

  if (!nombre) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  if (!codigo) return NextResponse.json({ ok: false, error: "El código es obligatorio" }, { status: 400 });
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ ok: false, error: `Tipo inválido. Debe ser uno de: ${TIPOS_VALIDOS.join(", ")}` }, { status: 400 });
  }
  if (!CANTIDAD_FUENTES_VALIDAS.includes(cantidadFuente)) {
    return NextResponse.json(
      { ok: false, error: `cantidad_fuente inválida. Debe ser una de: ${CANTIDAD_FUENTES_VALIDAS.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_variables")
    .insert({
      nombre,
      codigo,
      tipo,
      orden: body.orden ?? 0,
      obligatorio: body.obligatorio ?? false,
      afecta_precio: body.afecta_precio ?? true,
      descripcion: body.descripcion ?? null,
      cantidad_fuente: cantidadFuente,
      unidad_cantidad: body.unidad_cantidad ?? null,
      cantidad_min: body.cantidad_min ?? null,
      cantidad_max: body.cantidad_max ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: `Ya existe una variable con el código "${codigo}"` }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, variable: data });
}
