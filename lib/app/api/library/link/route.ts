import { NextRequest, NextResponse } from "next/server";
import { getLibraryAuth, puedeVerRepositorio } from "@/lib/library/auth";
import { getDocument, linkDocument, unlinkDocument } from "@/lib/library/repository";

function readLinkParams(body: Record<string, unknown> | null, sp: URLSearchParams) {
  return {
    documentId: String(body?.document_id ?? sp.get("document_id") ?? ""),
    entityType: String(body?.entity_type ?? sp.get("entity_type") ?? "").trim(),
    entityId: String(body?.entity_id ?? sp.get("entity_id") ?? ""),
  };
}

/**
 * POST /api/library/link
 * Body: { document_id, entity_type, entity_id }
 * Asocia un documento a cualquier entidad de FACILIA (Organización,
 * Persona, Cotización, Ticket, etc.) — entity_type es un string
 * libre, sin FK real (tabla polimórfica).
 */
export async function POST(req: NextRequest) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { documentId, entityType, entityId } = readLinkParams(body, req.nextUrl.searchParams);
  if (!documentId || !entityType || !entityId) {
    return NextResponse.json({ ok: false, error: "Faltan document_id, entity_type o entity_id" }, { status: 400 });
  }

  const { data: document, error: documentError } = await getDocument(documentId);
  if (documentError) return NextResponse.json({ ok: false, error: documentError }, { status: 500 });
  if (!document) return NextResponse.json({ ok: false, error: "El documento no existe" }, { status: 404 });
  if (!puedeVerRepositorio(auth, document.repository_type)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const { data, error } = await linkDocument({ documentId, entityType, entityId, createdBy: auth.uid });
  if (error) {
    const isDuplicate = error.toLowerCase().includes("duplicate") || error.toLowerCase().includes("unique");
    return NextResponse.json(
      { ok: false, error: isDuplicate ? "Ese documento ya está vinculado a esta entidad." : error },
      { status: isDuplicate ? 409 : 500 }
    );
  }
  return NextResponse.json({ ok: true, link: data }, { status: 201 });
}

/**
 * DELETE /api/library/link
 * Body o query params: document_id, entity_type, entity_id
 */
export async function DELETE(req: NextRequest) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { documentId, entityType, entityId } = readLinkParams(body, req.nextUrl.searchParams);
  if (!documentId || !entityType || !entityId) {
    return NextResponse.json({ ok: false, error: "Faltan document_id, entity_type o entity_id" }, { status: 400 });
  }

  const { error } = await unlinkDocument({ documentId, entityType, entityId });
  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
