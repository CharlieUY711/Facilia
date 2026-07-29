import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRrhhAuth, puedeVerLegajo } from "@/lib/rrhh/auth";

const BUCKET = "rrhh-documentos";

/**
 * GET /api/rrhh/documentos/:id/url
 * Devuelve una URL firmada de corta duración para ver/descargar el
 * archivo. El bucket es privado — nunca se sirve una URL pública.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getRrhhAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { data: doc, error: fetchError } = await service
    .from("rrhh_documentos")
    .select("id, persona_id, storage_path")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  if (!doc) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
  if (!puedeVerLegajo(auth, doc.persona_id)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  if (!doc.storage_path) {
    return NextResponse.json({ ok: false, error: "Este documento todavía no tiene archivo" }, { status: 404 });
  }

  const { data, error } = await service.storage.from(BUCKET).createSignedUrl(doc.storage_path, 300);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, url: data.signedUrl });
}
