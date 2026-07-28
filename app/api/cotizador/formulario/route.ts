// app/api/cotizador/formulario/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();

  // 1) Pasos activos ordenados
  const { data: pasos, error: pasosErr } = await supabase
    .from("cotizador_pasos")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (pasosErr) {
    return NextResponse.json({ ok: false, error: pasosErr.message });
  }

  // 2) Campos activos por paso
  const { data: campos, error: camposErr } = await supabase
    .from("cotizador_campos")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (camposErr) {
    return NextResponse.json({ ok: false, error: camposErr.message });
  }

  // 3) Opciones de variables (solo para campos con variable_id)
  const variableIds = campos.filter((c) => c.variable_id).map((c) => c.variable_id);

  let opcionesPorVariable: Record<string, any[]> = {};

  if (variableIds.length > 0) {
    const { data: opciones, error: opcionesErr } = await supabase
      .from("cotizador_opciones")
      .select("*")
      .in("variable_id", variableIds)
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (opcionesErr) {
      return NextResponse.json({ ok: false, error: opcionesErr.message });
    }

    for (const o of opciones) {
      if (!opcionesPorVariable[o.variable_id]) opcionesPorVariable[o.variable_id] = [];
      opcionesPorVariable[o.variable_id].push({
        value: o.codigo,
        label: o.nombre,
      });
    }
  }

  // 4) Armar estructura final
  const pasosConCampos = pasos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    orden: p.orden,
    campos: campos
      .filter((c) => c.paso_id === p.id)
      .map((c) => ({
        id: c.id,
        paso_id: c.paso_id,
        nombre: c.nombre,
        codigo: c.codigo,
        tipo_input: c.tipo_input,
        obligatorio: c.obligatorio,
        orden: c.orden,
        activo: c.activo,
        variable_id: c.variable_id,
        opciones: c.variable_id
          ? opcionesPorVariable[c.variable_id] ?? []
          : c.opciones ?? [],
      })),
  }));

  return NextResponse.json({ ok: true, pasos: pasosConCampos });
}
