import { NextRequest,NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";


/**
 * PATCH /api/cotizador/opciones/:id
 * Acepta nombre, codigo, factor, precio_fijo, orden y activo.
 * Si viene "codigo", valida que el par variable_id+codigo siga siendo
 * único dentro de la misma variable (variable_id no se puede cambiar
 * desde acá).
 */
export async function PATCH(
 req:NextRequest,
 {params}:{params:{id:string}}
){

 const auth = await requireAdmin();
 if (!auth) return NextResponse.json({ok:false,error:"No autorizado"},{status:403});

 const body=await req.json();

 const supabase=createServiceClient();

 if (body.codigo) {
   const { data: actual, error: errorActual } = await supabase
     .from("cotizador_opciones")
     .select("variable_id")
     .eq("id", params.id)
     .maybeSingle();

   if (errorActual) {
     return NextResponse.json({ ok: false, error: errorActual.message }, { status: 500 });
   }
   if (!actual) {
     return NextResponse.json({ ok: false, error: "Opción no encontrada" }, { status: 404 });
   }

   const { data: duplicada, error: errorDuplicada } = await supabase
     .from("cotizador_opciones")
     .select("id")
     .eq("variable_id", actual.variable_id)
     .eq("codigo", body.codigo)
     .neq("id", params.id)
     .maybeSingle();

   if (errorDuplicada) {
     return NextResponse.json({ ok: false, error: errorDuplicada.message }, { status: 500 });
   }
   if (duplicada) {
     return NextResponse.json(
       { ok: false, error: `Ya existe una opción con el código "${body.codigo}" para esta variable` },
       { status: 400 }
     );
   }
 }

 const updates: Record<string, unknown> = {};
 if ("nombre" in body) updates.nombre = body.nombre;
 if ("codigo" in body) updates.codigo = body.codigo;
 if ("factor" in body) updates.factor = body.factor;
 if ("precio_fijo" in body) updates.precio_fijo = body.precio_fijo;
 if ("orden" in body) updates.orden = body.orden;
 if ("activo" in body) updates.activo = body.activo;

 if (Object.keys(updates).length === 0) {
   return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
 }

 const {data,error}=await supabase
 .from("cotizador_opciones")
 .update(updates)
 .eq("id",params.id)
 .select()
 .single();


 if(error){
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

/**
 * DELETE /api/cotizador/opciones/:id
 * Eliminación lógica (activo=false) — mismo criterio que las variables.
 */
export async function DELETE(
 _req:NextRequest,
 {params}:{params:{id:string}}
){

 const auth = await requireAdmin();
 if (!auth) return NextResponse.json({ok:false,error:"No autorizado"},{status:403});

 const supabase=createServiceClient();

 const {data,error}=await supabase
 .from("cotizador_opciones")
 .update({activo:false})
 .eq("id",params.id)
 .select()
 .single();

 if(error){
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
