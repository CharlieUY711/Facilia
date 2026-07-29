import { NextRequest, NextResponse } from "next/server";
import { getLibraryAuth, puedeEscribirRepositorio, puedeVerRepositorio } from "@/lib/library/auth";
import { deleteFolder, folderHasChildren, getFolder, getFolderAncestors, updateFolder } from "@/lib/library/repository";
import { sanitizeName } from "@/lib/library/validation";

/**
 * GET /api/library/folders/:id?with_ancestors=1
 * Devuelve la carpeta y, si se pide, la cadena de carpetas ancestras
 * (para armar el breadcrumb en la UI).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { data: folder, error } = await getFolder(params.id);
  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  if (!folder) return NextResponse.json({ ok: false, error: "No encontrada" }, { status: 404 });
  if (!puedeVerRepositorio(auth, folder.repository_type)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const withAncestors = req.nextUrl.searchParams.get("with_ancestors");
  if (!withAncestors) return NextResponse.json({ ok: true, folder });

  const { data: ancestors, error: ancestorsError } = await getFolderAncestors(params.id);
  if (ancestorsError) return NextResponse.json({ ok: false, error: ancestorsError }, { status: 500 });
  return NextResponse.json({ ok: true, folder, ancestors });
}

/**
 * PATCH /api/library/folders/:id
 * Body: { nombre?, descripcion?, parent_folder_id?, orden? }
 * Renombra y/o mueve (cambia parent_folder_id) una carpeta.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { data: existing, error: existingError } = await getFolder(params.id);
  if (existingError) return NextResponse.json({ ok: false, error: existingError }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "No encontrada" }, { status: 404 });
  if (!puedeEscribirRepositorio(auth, existing.repository_type)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });

  if (body.parent_folder_id) {
    if (body.parent_folder_id === params.id) {
      return NextResponse.json({ ok: false, error: "Una carpeta no puede ser su propia carpeta padre." }, { status: 400 });
    }
    const { data: destino, error: destinoError } = await getFolder(body.parent_folder_id);
    if (destinoError) return NextResponse.json({ ok: false, error: destinoError }, { status: 500 });
    if (!destino) return NextResponse.json({ ok: false, error: "La carpeta destino no existe." }, { status: 404 });
    if (destino.repository_type !== existing.repository_type) {
      return NextResponse.json({ ok: false, error: "No se puede mover entre repositorios distintos." }, { status: 400 });
    }
  }

  const { data, error } = await updateFolder(params.id, {
    nombre: body.nombre !== undefined ? sanitizeName(String(body.nombre)) : undefined,
    descripcion: body.descripcion !== undefined ? (body.descripcion ? String(body.descripcion) : null) : undefined,
    parent_folder_id: body.parent_folder_id !== undefined ? body.parent_folder_id || null : undefined,
    orden: body.orden !== undefined ? Number(body.orden) : undefined,
    updatedBy: auth.uid,
  });

  if (error) {
    const isDuplicate = error.toLowerCase().includes("duplicate") || error.toLowerCase().includes("unique");
    return NextResponse.json(
      { ok: false, error: isDuplicate ? "Ya existe una carpeta con ese nombre en este lugar." : error },
      { status: isDuplicate ? 409 : 500 }
    );
  }
  return NextResponse.json({ ok: true, folder: data });
}

/**
 * DELETE /api/library/folders/:id
 * Sólo permite borrar carpetas vacías (sin subcarpetas ni documentos).
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { data: existing, error: existingError } = await getFolder(params.id);
  if (existingError) return NextResponse.json({ ok: false, error: existingError }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "No encontrada" }, { status: 404 });
  if (!puedeEscribirRepositorio(auth, existing.repository_type)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const { hasChildren, error: childrenError } = await folderHasChildren(params.id);
  if (childrenError) return NextResponse.json({ ok: false, error: childrenError }, { status: 500 });
  if (hasChildren) {
    return NextResponse.json(
      { ok: false, error: "La carpeta no está vacía. Movés o borrás su contenido antes de eliminarla." },
      { status: 409 }
    );
  }

  const { error } = await deleteFolder(params.id);
  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
