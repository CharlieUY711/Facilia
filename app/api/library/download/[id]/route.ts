import { NextRequest, NextResponse } from "next/server";
import { getLibraryAuth, puedeVerRepositorio } from "@/lib/library/auth";
import { getDocument } from "@/lib/library/repository";
import { getSignedDownloadUrl } from "@/lib/library/storage";

/**
 * GET /api/library/download/:id
 * Devuelve una signed URL de corta duración para ver o descargar el
 * archivo. Se usa tanto para el botón "Descargar" como para el
 * Preview de imágenes/PDF — nunca se sirve una URL pública.
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

  const { url, error: urlError } = await getSignedDownloadUrl({
    bucket: document.storage_bucket,
    path: document.storage_path,
  });
  if (urlError) return NextResponse.json({ ok: false, error: urlError }, { status: 500 });

  return NextResponse.json({ ok: true, url, document });
}
