import { NextRequest, NextResponse } from "next/server";
import { getLibraryAuth, puedeEscribirRepositorio, puedeVerRepositorio } from "@/lib/library/auth";
import { getDocument, getFolder, softDeleteDocument, updateDocument } from "@/lib/library/repository";
import { sanitizeName } from "@/lib/library/validation";

/**
 * GET /api/library/documents/:id
 * "Ver propiedades" de un documento.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { data: document, error } = await getDocument(params.id);
  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  if (!document) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
  if (!puedeVerRepositorio(auth, document.repository_type)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, document });
}

/**
 * PATCH /api/library/documents/:id
 * Body: { title?, description?, folder_id?, organizacion_id? }
 * Cubre "Renombrar", "Mover" y edición de descripción/organización.
 * No permite cambiar repository_type (implicaría mover de bucket;
 * fuera de alcance de esta etapa).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { data: existing, error: existingError } = await getDocument(params.id);
  if (existingError) return NextResponse.json({ ok: false, error: existingError }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
  if (!puedeEscribirRepositorio(auth, existing.repository_type)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });

  if (body.folder_id) {
    const { data: destino, error: destinoError } = await getFolder(body.folder_id);
    if (destinoError) return NextResponse.json({ ok: false, error: destinoError }, { status: 500 });
    if (!destino) return NextResponse.json({ ok: false, error: "La carpeta destino no existe." }, { status: 404 });
    if (destino.repository_type !== existing.repository_type) {
      return NextResponse.json({ ok: false, error: "No se puede mover a una carpeta de otro repositorio." }, { status: 400 });
    }
  }

  const { data, error } = await updateDocument(params.id, {
    title: body.title !== undefined ? sanitizeName(String(body.title)) : undefined,
    description: body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
    folder_id: body.folder_id !== undefined ? body.folder_id || null : undefined,
    organizacion_id: body.organizacion_id !== undefined ? body.organizacion_id || null : undefined,
    updatedBy: auth.uid,
  });

  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  return NextResponse.json({ ok: true, document: data });
}

/**
 * DELETE /api/library/documents/:id
 * Borrado lógico (soft delete). El archivo permanece en Storage por
 * si hace falta recuperarlo — el borrado físico queda para una
 * limpieza programada futura, fuera de este alcance.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { data: existing, error: existingError } = await getDocument(params.id);
  if (existingError) return NextResponse.json({ ok: false, error: existingError }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
  if (!puedeEscribirRepositorio(auth, existing.repository_type)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const { error } = await softDeleteDocument(params.id);
  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
