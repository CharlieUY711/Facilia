import { NextRequest,NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

// Auditoría (quién/cuándo) agregada en 2026_07_29_cotizador_precios_auditoria.sql
// — igual patrón de fallback que /api/cotizador/parametros: si esa migración
// todavía no corrió contra la base, no rompe el guardado, solo no graba/trae
// quién lo modificó.
const SELECT_CON_AUDITORIA =
  "*, actualizado_por_perfil:profiles!cotizador_opciones_actualizado_por_fkey(nombre,email)";

/**
 * PATCH /api/cotizador/opciones/:id
 * Body: { nombre?, codigo?, factor?, precio_fijo?, orden?, activo?,
 *         rendimiento_m2_hora?, insumos_m2?, frecuencia_independiente?, visitas_mes? }
 * Solo Super Admin / Admin.
 */
export async function PATCH(
 req:NextRequest,
 {params}:{params:{id:string}}
){

 const auth = await requireAdmin();
 if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

 const body=await req.json();

 const update: Record<string, unknown> = {};
 if (body.nombre !== undefined) update.nombre = body.nombre;
 if (body.codigo !== undefined) update.codigo = body.codigo;
 if (body.factor !== undefined) update.factor = body.factor;
 if (body.precio_fijo !== undefined) update.precio_fijo = body.precio_fijo;
 if (body.orden !== undefined) update.orden = body.orden;
 if (body.activo !== undefined) update.activo = body.activo;
 if (body.rendimiento_m2_hora !== undefined) update.rendimiento_m2_hora = body.rendimiento_m2_hora;
 if (body.insumos_m2 !== undefined) update.insumos_m2 = body.insumos_m2;
 if (body.frecuencia_independiente !== undefined) update.frecuencia_independiente = body.frecuencia_independiente;
 if (body.visitas_mes !== undefined) update.visitas_mes = body.visitas_mes;

 if (Object.keys(update).length === 0) {
   return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
 }

 const supabase=createServiceClient();

 const conAuditoria = await supabase
   .from("cotizador_opciones")
   .update({ ...update, actualizado_en: new Date().toISOString(), actualizado_por: auth.uid })
   .eq("id", params.id)
   .select(SELECT_CON_AUDITORIA)
   .single();

 if (!conAuditoria.error) {
   return NextResponse.json({ ok: true, opcion: conAuditoria.data });
 }

 console.error(
   `[PATCH /api/cotizador/opciones/${params.id}] falló el update con auditoría, reintentando sin ella:`,
   conAuditoria.error
 );

 const {data,error}=await supabase
 .from("cotizador_opciones")
 .update(update)
 .eq("id",params.id)
 .select()
 .single();


 if(error){
   if (error.code === "23505") {
     return NextResponse.json({ ok: false, error: "Ya existe otra opción con ese código para esta variable" }, { status: 409 });
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

/**
 * DELETE /api/cotizador/opciones/:id
 * Borrado lógico (activo=false), nunca físico.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cotizador_opciones")
    .update({ activo: false })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, opcion: data });
}
