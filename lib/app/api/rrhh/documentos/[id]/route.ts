import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRrhhAuth, puedeVerLegajo } from "@/lib/rrhh/auth";

const BUCKET = "rrhh-documentos";

/**
 * PATCH /api/rrhh/documentos/:id
 * FormData: file? (para resolver un pendiente subiendo el archivo
 * firmado/completo, o para reemplazar un documento personal),
 * estado? ("anulado" — solo Admin, o "pendiente_firma"/"pendiente_completar"
 * para volver a pedirle algo al colaborador — solo Admin),
 * nombre?, tipo?, vencimiento?, notas?.
 *
 * Nadie edita libremente un documento de empresa: solo Admin puede
 * anularlo o volver a pedir una acción. El colaborador únicamente
 * puede resolver el pendiente puntual que se le pidió, adjuntando el
 * archivo correspondiente.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getRrhhAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { data: doc, error: fetchError } = await service
    .from("rrhh_documentos")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  if (!doc) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
  if (!puedeVerLegajo(auth, doc.persona_id)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const estadoPedido = (form.get("estado") as string) || null;
  const updates: Record<string, unknown> = {};

  // Metadata: solo Admin la edita para documentos de empresa; para
  // documentos personales, también el dueño.
  const puedeEditarMetadata = auth.isAdmin || (doc.categoria === "personal" && auth.personaId === doc.persona_id);
  if (puedeEditarMetadata) {
    for (const campo of ["nombre", "tipo", "vencimiento", "notas"] as const) {
      if (form.has(campo)) updates[campo] = (form.get(campo) as string) || null;
    }
  }

  // Admin: anular o volver a pedir firma/completar.
  if (estadoPedido) {
    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }
    if (!["anulado", "pendiente_firma", "pendiente_completar"].includes(estadoPedido)) {
      return NextResponse.json({ ok: false, error: "Estado inválido" }, { status: 400 });
    }
    updates.estado = estadoPedido;
    if (estadoPedido === "anulado") updates.resuelto_at = new Date().toISOString();
  }

  // Subir/reemplazar archivo: resuelve un pendiente (dueño o Admin), o
  // reemplaza un documento personal (dueño o Admin).
  if (file && file.size > 0) {
    const esPendiente = doc.estado === "pendiente_firma" || doc.estado === "pendiente_completar";
    const puedeSubir =
      auth.isAdmin || (auth.personaId === doc.persona_id && (esPendiente || doc.categoria === "personal"));
    if (!puedeSubir) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    const storagePath = `${doc.persona_id}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });
    if (uploadError) return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });

    updates.storage_path = storagePath;
    updates.estado = "vigente";
    if (esPendiente) updates.resuelto_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }

  const { data, error } = await service
    .from("rrhh_documentos")
    .update(updates)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, documento: data });
}
