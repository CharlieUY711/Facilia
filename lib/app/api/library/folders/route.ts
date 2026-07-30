import { NextRequest, NextResponse } from "next/server";
import { getLibraryAuth, puedeEscribirRepositorio, puedeVerRepositorio } from "@/lib/library/auth";
import { createFolder, listFolders } from "@/lib/library/repository";
import { isValidRepositoryType, sanitizeName } from "@/lib/library/validation";

/**
 * GET /api/library/folders?repository_type=publica&parent_folder_id=...
 * Lista las subcarpetas directas de una carpeta (o de la raíz del
 * repositorio si no se pasa parent_folder_id).
 */
export async function GET(req: NextRequest) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const repositoryType = req.nextUrl.searchParams.get("repository_type");
  if (!isValidRepositoryType(repositoryType)) {
    return NextResponse.json({ ok: false, error: 'El repositorio debe ser "publica" o "privada".' }, { status: 400 });
  }
  if (!puedeVerRepositorio(auth, repositoryType)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const parentFolderId = req.nextUrl.searchParams.get("parent_folder_id");
  const { data, error } = await listFolders({ repositoryType, parentFolderId: parentFolderId || null });
  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  return NextResponse.json({ ok: true, folders: data });
}

/**
 * POST /api/library/folders
 * Body: { repository_type, nombre, parent_folder_id?, organizacion_id?, descripcion? }
 */
export async function POST(req: NextRequest) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });

  const repositoryType = body.repository_type;
  if (!isValidRepositoryType(repositoryType)) {
    return NextResponse.json({ ok: false, error: 'El repositorio debe ser "publica" o "privada".' }, { status: 400 });
  }
  if (!puedeEscribirRepositorio(auth, repositoryType)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const nombre = sanitizeName(String(body.nombre ?? ""));
  if (!nombre) {
    return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  }

  const { data, error } = await createFolder({
    repository_type: repositoryType,
    parent_folder_id: body.parent_folder_id || null,
    organizacion_id: body.organizacion_id || null,
    nombre,
    descripcion: body.descripcion ? String(body.descripcion) : null,
    createdBy: auth.uid,
  });

  if (error) {
    const isDuplicate = error.toLowerCase().includes("duplicate") || error.toLowerCase().includes("unique");
    return NextResponse.json(
      { ok: false, error: isDuplicate ? "Ya existe una carpeta con ese nombre en este lugar." : error },
      { status: isDuplicate ? 409 : 500 }
    );
  }
  return NextResponse.json({ ok: true, folder: data }, { status: 201 });
}
