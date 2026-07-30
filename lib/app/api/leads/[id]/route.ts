import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase.from("leads").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
  return NextResponse.json({ ok: true, lead: data });
}

const ESTADOS = ["nuevo", "calificado", "visita_programada", "cotizado", "negociacion", "ganado", "perdido"] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const update: Record<string, any> = {};

  if (body.estado) {
    if (!ESTADOS.includes(body.estado)) {
      return NextResponse.json({ ok: false, error: "Estado inválido" }, { status: 400 });
    }
    update.estado = body.estado;
  }
  if (typeof body.notas === "string") update.notas = body.notas;

  if (body.accion === "crear_visita") {
    const { data: visita, error: visitaError } = await supabase
      .from("visitas")
      .insert({
        lead_id: params.id,
        fecha: body.fecha ?? null,
        hora: body.hora ?? null,
        estado: "pendiente",
        notas: body.notas ?? null
      })
      .select()
      .single();

    if (visitaError) {
      return NextResponse.json(
        { ok: false, error: visitaError.message },
        { status: 500 }
      );
    }

    update.estado = "visita_programada";
  }

  const { data, error } = await supabase.from("leads").update(update).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, lead: data });
}


