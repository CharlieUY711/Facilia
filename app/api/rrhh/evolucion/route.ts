import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRrhhAuth, puedeVerLegajo } from "@/lib/rrhh/auth";

/**
 * GET /api/rrhh/evolucion?persona_id=...&anio=2026
 * Asistencias y haberes de un año completo, para armar el mini
 * gráfico de barras por mes en la pestaña "Evolución".
 */
export async function GET(req: NextRequest) {
  const auth = await getRrhhAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const personaId = req.nextUrl.searchParams.get("persona_id");
  const anio = Number(req.nextUrl.searchParams.get("anio")) || new Date().getFullYear();
  if (!personaId) return NextResponse.json({ ok: false, error: "Falta persona_id" }, { status: 400 });
  if (!puedeVerLegajo(auth, personaId)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const service = createServiceClient();
  const [asistenciasRes, haberesRes] = await Promise.all([
    service
      .from("rrhh_asistencias")
      .select("*")
      .eq("persona_id", personaId)
      .gte("fecha", `${anio}-01-01`)
      .lte("fecha", `${anio}-12-31`)
      .order("fecha", { ascending: true }),
    service
      .from("rrhh_haberes")
      .select("*")
      .eq("persona_id", personaId)
      .eq("anio", anio)
      .order("mes", { ascending: true }),
  ]);

  if (asistenciasRes.error) {
    return NextResponse.json({ ok: false, error: asistenciasRes.error.message }, { status: 500 });
  }
  if (haberesRes.error) {
    return NextResponse.json({ ok: false, error: haberesRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    anio,
    asistencias: asistenciasRes.data,
    haberes: haberesRes.data,
  });
}
