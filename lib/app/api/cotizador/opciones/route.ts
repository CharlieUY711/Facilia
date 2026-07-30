import { NextRequest,NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";


/**
 * POST /api/cotizador/opciones
 * Body: { variable_id, nombre, codigo, factor?, precio_fijo?, orden?,
 *         rendimiento_m2_hora?, insumos_m2?, frecuencia_independiente?, visitas_mes? }
 * Crea una opción nueva para una variable existente. Solo Super Admin / Admin.
 *
 * Los 4 campos nuevos (Etapa 5D-bis) solo tienen sentido según qué
 * variable sea `variable_id`: rendimiento_m2_hora / insumos_m2 /
 * frecuencia_independiente para TIPO_AMBIENTE, visitas_mes para
 * FRECUENCIA. Esta ruta no valida esa correspondencia — la valida el
 * motor (lib/cotizador/engine.ts) al calcular, con un error explícito
 * si falta el campo que corresponde.
 */
export async function POST(req:NextRequest){

 const auth = await requireAdmin();
 if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

 const body=await req.json();

 if (!body.variable_id) {
   return NextResponse.json({ ok: false, error: "variable_id es obligatorio" }, { status: 400 });
 }
 const nombre = (body.nombre ?? "").trim();
 const codigo = (body.codigo ?? "").trim();
 if (!nombre) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
 if (!codigo) return NextResponse.json({ ok: false, error: "El código es obligatorio" }, { status: 400 });

 const supabase=createServiceClient();

 const {data,error}=await supabase
 .from("cotizador_opciones")
 .insert({
    variable_id:body.variable_id,
    nombre,
    codigo,
    factor:body.factor ?? 1,
    precio_fijo:body.precio_fijo ?? null,
    orden:body.orden ?? 0,
    rendimiento_m2_hora: body.rendimiento_m2_hora ?? null,
    insumos_m2: body.insumos_m2 ?? null,
    frecuencia_independiente: body.frecuencia_independiente ?? false,
    visitas_mes: body.visitas_mes ?? null
 })
 .select()
 .single();


 if(error){
   if (error.code === "23505") {
     return NextResponse.json({ ok: false, error: `Esa variable ya tiene una opción con el código "${codigo}"` }, { status: 409 });
   }
   return NextResponse.json(
    {ok:false,error:error.message},
    {status:500}
   );
 }


 return NextResponse.json({
   ok:true,
   opcion:data
 });

}
