import { NextRequest,NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";


export async function POST(req:NextRequest){

 const auth = await requireAdmin();
 if (!auth) return NextResponse.json({ok:false,error:"No autorizado"},{status:403});

 const body=await req.json();

 const supabase=createServiceClient();

 const {data,error}=await supabase
 .from("cotizador_opciones")
 .insert({
    variable_id:body.variable_id,
    nombre:body.nombre,
    codigo:body.codigo,
    factor:body.factor ?? 1,
    orden:body.orden ?? 0
 })
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
