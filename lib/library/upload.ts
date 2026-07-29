import { bucketForRepository } from "./constants";
import { createDocument, getFolder } from "./repository";
import { uploadFileToStorage } from "./storage";
import { getExtension, isValidRepositoryType, sanitizeName, validateUploadFile } from "./validation";
import type { LibraryAuth } from "./auth";
import { puedeEscribirRepositorio } from "./auth";
import type { LibraryDocument } from "./types";

export interface UploadResult {
  status: number;
  data: LibraryDocument | null;
  error: string | null;
}

/**
 * Caso de uso "UploadDocument". Recibe el FormData tal cual llega de
 * la request (mismo formato para POST /api/library/documents y
 * POST /api/library/upload, para no duplicar la lógica) y devuelve
 * el documento creado o un error con el status HTTP sugerido.
 *
 * Campos esperados en el FormData:
 *   file (obligatorio), repository_type (obligatorio: "publica" | "privada"),
 *   folder_id?, organizacion_id?, title?, description?
 */
export async function uploadDocumentFromFormData(form: FormData, auth: LibraryAuth): Promise<UploadResult> {
  const file = form.get("file") as File | null;
  const repositoryType = String(form.get("repository_type") || "");
  const folderId = (form.get("folder_id") as string) || null;
  const organizacionId = (form.get("organizacion_id") as string) || null;
  const titleRaw = (form.get("title") as string) || "";
  const description = (form.get("description") as string) || null;

  if (!file) {
    return { status: 400, data: null, error: "Falta el archivo a subir." };
  }
  if (!isValidRepositoryType(repositoryType)) {
    return { status: 400, data: null, error: 'El repositorio debe ser "publica" o "privada".' };
  }
  if (!puedeEscribirRepositorio(auth, repositoryType)) {
    return { status: 403, data: null, error: "No autorizado para subir a este repositorio." };
  }

  const fileError = validateUploadFile({ name: file.name, size: file.size });
  if (fileError) {
    return { status: 400, data: null, error: fileError };
  }

  if (folderId) {
    const { data: folder, error: folderError } = await getFolder(folderId);
    if (folderError) return { status: 500, data: null, error: folderError };
    if (!folder) return { status: 404, data: null, error: "La carpeta indicada no existe." };
    if (folder.repository_type !== repositoryType) {
      return { status: 400, data: null, error: "La carpeta pertenece a otro repositorio." };
    }
  }

  const extension = getExtension(file.name);
  const bucket = bucketForRepository(repositoryType);
  const storagePath = `${repositoryType}/${folderId ?? "root"}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await uploadFileToStorage({
    bucket,
    path: storagePath,
    buffer,
    contentType: file.type || "application/octet-stream",
  });
  if (uploadError) {
    return { status: 500, data: null, error: uploadError };
  }

  const title = sanitizeName(titleRaw) || sanitizeName(file.name, 200) || file.name;

  const { data, error } = await createDocument({
    organizacionId,
    folderId,
    repositoryType,
    storageBucket: bucket,
    storagePath,
    fileName: storagePath.split("/").pop() || file.name,
    originalName: file.name,
    extension,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    title,
    description,
    createdBy: auth.uid,
  });

  if (error) {
    return { status: 500, data: null, error };
  }
  return { status: 201, data, error: null };
}
