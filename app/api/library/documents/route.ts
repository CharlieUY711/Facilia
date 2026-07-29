import { NextRequest, NextResponse } from "next/server";
import { getLibraryAuth, puedeVerRepositorio } from "@/lib/library/auth";
import { listDocuments } from "@/lib/library/repository";
import { uploadDocumentFromFormData } from "@/lib/library/upload";
import { isValidRepositoryType } from "@/lib/library/validation";

/**
 * GET /api/library/documents
 * Query params: repository_type (obligatorio), folder_id? ("" para
 * listar sólo los documentos sueltos en la raíz), q? (busca en
 * título, descripción, nombre original y extensión), extension?,
 * mime_type?, organizacion_id?, created_by?, date_from?, date_to?,
 * page?, page_size?
 */
export async function GET(req: NextRequest) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const repositoryType = sp.get("repository_type");
  if (!isValidRepositoryType(repositoryType)) {
    return NextResponse.json({ ok: false, error: 'El repositorio debe ser "publica" o "privada".' }, { status: 400 });
  }
  if (!puedeVerRepositorio(auth, repositoryType)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const folderIdParam = sp.get("folder_id");
  const { data, error } = await listDocuments({
    repository_type: repositoryType,
    folder_id: folderIdParam === null ? undefined : folderIdParam === "" ? null : folderIdParam,
    q: sp.get("q") || undefined,
    extension: sp.get("extension") || undefined,
    mime_type: sp.get("mime_type") || undefined,
    organizacion_id: sp.get("organizacion_id") || undefined,
    created_by: sp.get("created_by") || undefined,
    date_from: sp.get("date_from") || undefined,
    date_to: sp.get("date_to") || undefined,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
    page_size: sp.get("page_size") ? Number(sp.get("page_size")) : undefined,
  });

  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  return NextResponse.json({ ok: true, ...data });
}

/**
 * POST /api/library/documents
 * FormData: file, repository_type, folder_id?, organizacion_id?,
 * title?, description?. Misma lógica que POST /api/library/upload —
 * se deja este endpoint también porque LIB-00/LIB-01 lo previeron
 * como "crear documento" además del endpoint de subida dedicado.
 */
export async function POST(req: NextRequest) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Body inválido, se espera multipart/form-data" }, { status: 400 });

  const result = await uploadDocumentFromFormData(form, auth);
  if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, document: result.data }, { status: result.status });
}
