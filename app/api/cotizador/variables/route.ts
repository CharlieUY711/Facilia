import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_VALIDOS = [
  "select",
  "select_repetible",
  "number",
  "boolean",
  "text",
  "formula",
] as const;

export async function GET(){

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
 * Crea una variable del cotizador (ej: TIPO_AMBIENTE, FRECUENCIA).
 * Body: { nombre, codigo, tipo?, orden?, obligatorio?, afecta_precio?, descripcion? }
 * Solo Super Admin / Administrador.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();

  const nombre = (body.nombre ?? "").trim();
  const codigo = (body.codigo ?? "").trim();

  if (!nombre) {
    return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (!codigo) {
    return NextResponse.json({ ok: false, error: "El código es obligatorio" }, { status: 400 });
  }
  if (body.tipo && !TIPOS_VALIDOS.includes(body.tipo)) {
    return NextResponse.json({ ok: false, error: "Tipo de variable inválido" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Validar codigo único antes de insertar, para devolver un mensaje de
  // error claro en vez del error crudo de Postgres (constraint violation).
  const { data: existente, error: errorBusqueda } = await supabase
    .from("cotizador_variables")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();

  if (errorBusqueda) {
    return NextResponse.json({ ok: false, error: errorBusqueda.message }, { status: 500 });
  }
  if (existente) {
    return NextResponse.json(
      { ok: false, error: `Ya existe una variable con el código "${codigo}"` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("cotizador_variables")
    .insert({
      nombre,
      codigo,
      tipo: body.tipo ?? "select",
      orden: body.orden ?? 0,
      obligatorio: body.obligatorio ?? false,
      afecta_precio: body.afecta_precio ?? true,
      descripcion: body.descripcion || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, variable: data });
}
