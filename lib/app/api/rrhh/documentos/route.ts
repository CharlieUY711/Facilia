import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRrhhAuth, puedeVerLegajo } from "@/lib/rrhh/auth";

const BUCKET = "rrhh-documentos";
const CATEGORIAS_VALIDAS = ["empresa", "personal"] as const;
const ESTADOS_PENDIENTES_VALIDOS = ["pendiente_firma", "pendiente_completar"] as const;

/**
 * GET /api/rrhh/documentos?persona_id=...
 * Lista los documentos (empresa + personales) de un legajo.
 * Admin puede ver cualquiera; el colaborador solo el propio.
 */
export async function GET(req: NextRequest) {
  const auth = await getRrhhAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const personaId = req.nextUrl.searchParams.get("persona_id");
  if (!personaId) return NextResponse.json({ ok: false, error: "Falta persona_id" }, { status: 400 });
  if (!puedeVerLegajo(auth, personaId)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("rrhh_documentos")
    .select("*")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, documentos: data });
}

/**
 * POST /api/rrhh/documentos
 * FormData: persona_id, categoria ("empresa" | "personal"), nombre,
 * tipo?, vencimiento?, notas?, file? (adjunto), estado? (solo Admin,
 * para "pedir firma"/"pedir completar" sin adjuntar archivo todavía).
 *
 * Reglas: documentos de "empresa" los carga solo Admin. Documentos
 * "personal" los sube el propio colaborador (o Admin). Si no viene
 * archivo, Admin puede dejar el documento como pendiente para que el
 * colaborador lo resuelva después (ver PATCH /api/rrhh/documentos/:id).
 */
export async function POST(req: NextRequest) {
  const auth = await getRrhhAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const form = await req.formData();
  const personaId = String(form.get("persona_id") || "");
  const categoria = String(form.get("categoria") || "");
  const nombre = String(form.get("nombre") || "").trim();
  const tipo = (form.get("tipo") as string) || null;
  const vencimiento = (form.get("vencimiento") as string) || null;
  const notas = (form.get("notas") as string) || null;
  const estadoPedido = (form.get("estado") as string) || null;
  const file = form.get("file") as File | null;

  if (!personaId || !nombre) {
    return NextResponse.json({ ok: false, error: "Faltan datos obligatorios" }, { status: 400 });
  }
  if (!CATEGORIAS_VALIDAS.includes(categoria as any)) {
    return NextResponse.json({ ok: false, error: "Categoría inválida" }, { status: 400 });
  }
  if (!puedeVerLegajo(auth, personaId)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  if (categoria === "empresa" && !auth.isAdmin) {
    return NextResponse.json(
      { ok: false, error: "Solo Admin puede cargar documentos de la empresa." },
      { status: 403 }
    );
  }

  const service = createServiceClient();
  let storagePath: string | null = null;
  let estado = "vigente";

  if (file && file.size > 0) {
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    storagePath = `${personaId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });
    if (uploadError) return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
  } else {
    // Sin archivo: solo Admin puede dejar un pendiente para que el
    // colaborador lo resuelva más adelante.
    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: "Hay que adjuntar un archivo" }, { status: 400 });
    }
    if (!estadoPedido || !ESTADOS_PENDIENTES_VALIDOS.includes(estadoPedido as any)) {
      return NextResponse.json(
        { ok: false, error: "Sin archivo, indicá si pedís firma o pedís completar" },
        { status: 400 }
      );
    }
    estado = estadoPedido;
  }

  const { data, error } = await service
    .from("rrhh_documentos")
    .insert({
      persona_id: personaId,
      categoria,
      nombre,
      tipo,
      vencimiento: vencimiento || null,
      notas,
      storage_path: storagePath,
      estado,
      subido_por: auth.uid,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, documento: data });
}
