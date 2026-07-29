import { createServiceClient } from "@/lib/supabase/server";
import { DOCUMENT_PAGE_SIZE_DEFAULT, DOCUMENT_PAGE_SIZE_MAX } from "./constants";
import type {
  CreateFolderInput,
  DocumentFilters,
  LibraryDocument,
  LibraryDocumentLink,
  LibraryFolder,
  PaginatedResult,
  RepositoryType,
  UpdateDocumentInput,
  UpdateFolderInput,
} from "./types";

const FOLDER_SELECT = "*, organizaciones ( id, nombre )";
const DOCUMENT_SELECT = "*, organizaciones ( id, nombre )";

// ── Carpetas ────────────────────────────────────────────────────

export async function listFolders(params: {
  repositoryType: RepositoryType;
  parentFolderId: string | null;
}): Promise<{ data: LibraryFolder[]; error: string | null }> {
  const service = createServiceClient();
  let query = service
    .from("library_folders")
    .select(FOLDER_SELECT)
    .eq("repository_type", params.repositoryType)
    .is("deleted_at", null)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  query = params.parentFolderId ? query.eq("parent_folder_id", params.parentFolderId) : query.is("parent_folder_id", null);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as LibraryFolder[], error: null };
}

export async function getFolder(id: string): Promise<{ data: LibraryFolder | null; error: string | null }> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("library_folders")
    .select(FOLDER_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: (data as LibraryFolder | null) ?? null, error: null };
}

/**
 * Devuelve la cadena de carpetas ancestras (raíz primero, la propia
 * carpeta al final) para armar el breadcrumb en la UI. Se resuelve
 * con consultas iterativas simples — no hace falta una CTE
 * recursiva para la profundidad esperada de este árbol.
 */
export async function getFolderAncestors(folderId: string): Promise<{ data: LibraryFolder[]; error: string | null }> {
  const chain: LibraryFolder[] = [];
  let currentId: string | null = folderId;
  let guard = 0;

  while (currentId && guard < 50) {
    guard += 1;
    const { data, error } = await getFolder(currentId);
    if (error) return { data: [], error };
    if (!data) break;
    chain.unshift(data);
    currentId = data.parent_folder_id;
  }

  return { data: chain, error: null };
}

export async function createFolder(input: CreateFolderInput & { createdBy: string }): Promise<{
  data: LibraryFolder | null;
  error: string | null;
}> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("library_folders")
    .insert({
      repository_type: input.repository_type,
      parent_folder_id: input.parent_folder_id,
      organizacion_id: input.organizacion_id,
      nombre: input.nombre,
      descripcion: input.descripcion,
      created_by: input.createdBy,
      updated_by: input.createdBy,
    })
    .select(FOLDER_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as LibraryFolder, error: null };
}

export async function updateFolder(
  id: string,
  input: UpdateFolderInput & { updatedBy: string }
): Promise<{ data: LibraryFolder | null; error: string | null }> {
  const service = createServiceClient();
  const patch: Record<string, unknown> = { updated_by: input.updatedBy };
  if (input.nombre !== undefined) patch.nombre = input.nombre;
  if (input.descripcion !== undefined) patch.descripcion = input.descripcion;
  if (input.parent_folder_id !== undefined) patch.parent_folder_id = input.parent_folder_id;
  if (input.orden !== undefined) patch.orden = input.orden;

  const { data, error } = await service
    .from("library_folders")
    .update(patch)
    .eq("id", id)
    .select(FOLDER_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as LibraryFolder, error: null };
}

/**
 * Sólo permite borrar carpetas vacías (sin subcarpetas ni documentos
 * activos). Evita huérfanos y mueve la complejidad de "borrado en
 * cascada" fuera del alcance de esta etapa.
 */
export async function folderHasChildren(id: string): Promise<{ hasChildren: boolean; error: string | null }> {
  const service = createServiceClient();

  const [subfolders, documents] = await Promise.all([
    service.from("library_folders").select("id", { count: "exact", head: true }).eq("parent_folder_id", id).is("deleted_at", null),
    service.from("library_documents").select("id", { count: "exact", head: true }).eq("folder_id", id).is("deleted_at", null),
  ]);

  if (subfolders.error) return { hasChildren: false, error: subfolders.error.message };
  if (documents.error) return { hasChildren: false, error: documents.error.message };

  const hasChildren = (subfolders.count ?? 0) > 0 || (documents.count ?? 0) > 0;
  return { hasChildren, error: null };
}

export async function deleteFolder(id: string): Promise<{ error: string | null }> {
  const service = createServiceClient();
  const { error } = await service.from("library_folders").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

// ── Documentos ────────────────────────────────────────────────────

export async function getDocument(id: string): Promise<{ data: LibraryDocument | null; error: string | null }> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("library_documents")
    .select(DOCUMENT_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: (data as LibraryDocument | null) ?? null, error: null };
}

export async function listDocuments(
  filters: DocumentFilters
): Promise<{ data: PaginatedResult<LibraryDocument> | null; error: string | null }> {
  const service = createServiceClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(DOCUMENT_PAGE_SIZE_MAX, Math.max(1, filters.page_size ?? DOCUMENT_PAGE_SIZE_DEFAULT));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = service
    .from("library_documents")
    .select(DOCUMENT_SELECT, { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.repository_type) query = query.eq("repository_type", filters.repository_type);
  if (filters.folder_id === null) query = query.is("folder_id", null);
  else if (filters.folder_id) query = query.eq("folder_id", filters.folder_id);
  if (filters.extension) query = query.eq("extension", filters.extension.toLowerCase());
  if (filters.mime_type) query = query.eq("mime_type", filters.mime_type);
  if (filters.organizacion_id) query = query.eq("organizacion_id", filters.organizacion_id);
  if (filters.created_by) query = query.eq("created_by", filters.created_by);
  if (filters.date_from) query = query.gte("created_at", filters.date_from);
  if (filters.date_to) query = query.lte("created_at", filters.date_to);
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().replace(/[%_]/g, "");
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,original_name.ilike.%${q}%,extension.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) return { data: null, error: error.message };

  return {
    data: { items: (data ?? []) as LibraryDocument[], total: count ?? 0, page, page_size: pageSize },
    error: null,
  };
}

export async function createDocument(input: {
  organizacionId: string | null;
  folderId: string | null;
  repositoryType: RepositoryType;
  storageBucket: string;
  storagePath: string;
  fileName: string;
  originalName: string;
  extension: string;
  mimeType: string;
  fileSize: number;
  title: string;
  description: string | null;
  createdBy: string;
}): Promise<{ data: LibraryDocument | null; error: string | null }> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("library_documents")
    .insert({
      organizacion_id: input.organizacionId,
      folder_id: input.folderId,
      repository_type: input.repositoryType,
      storage_bucket: input.storageBucket,
      storage_path: input.storagePath,
      file_name: input.fileName,
      original_name: input.originalName,
      extension: input.extension,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      title: input.title,
      description: input.description,
      visibility: input.repositoryType,
      created_by: input.createdBy,
      updated_by: input.createdBy,
    })
    .select(DOCUMENT_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as LibraryDocument, error: null };
}

export async function updateDocument(
  id: string,
  input: UpdateDocumentInput & { updatedBy: string }
): Promise<{ data: LibraryDocument | null; error: string | null }> {
  const service = createServiceClient();
  const patch: Record<string, unknown> = { updated_by: input.updatedBy };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.folder_id !== undefined) patch.folder_id = input.folder_id;
  if (input.organizacion_id !== undefined) patch.organizacion_id = input.organizacion_id;

  const { data, error } = await service
    .from("library_documents")
    .update(patch)
    .eq("id", id)
    .select(DOCUMENT_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as LibraryDocument, error: null };
}

export async function softDeleteDocument(id: string): Promise<{ error: string | null }> {
  const service = createServiceClient();
  const { error } = await service.from("library_documents").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

// ── Vínculos polimórficos ──────────────────────────────────────────

export async function linkDocument(params: {
  documentId: string;
  entityType: string;
  entityId: string;
  createdBy: string;
}): Promise<{ data: LibraryDocumentLink | null; error: string | null }> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("library_document_links")
    .insert({
      document_id: params.documentId,
      entity_type: params.entityType,
      entity_id: params.entityId,
      created_by: params.createdBy,
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as LibraryDocumentLink, error: null };
}

export async function unlinkDocument(params: {
  documentId: string;
  entityType: string;
  entityId: string;
}): Promise<{ error: string | null }> {
  const service = createServiceClient();
  const { error } = await service
    .from("library_document_links")
    .delete()
    .eq("document_id", params.documentId)
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function listLinksForDocument(documentId: string): Promise<{ data: LibraryDocumentLink[]; error: string | null }> {
  const service = createServiceClient();
  const { data, error } = await service.from("library_document_links").select("*").eq("document_id", documentId);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as LibraryDocumentLink[], error: null };
}

export async function listDocumentsForEntity(params: {
  entityType: string;
  entityId: string;
}): Promise<{ data: LibraryDocument[]; error: string | null }> {
  const service = createServiceClient();
  const { data: links, error: linksError } = await service
    .from("library_document_links")
    .select("document_id")
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId);

  if (linksError) return { data: [], error: linksError.message };
  const documentIds = (links ?? []).map((l: { document_id: string }) => l.document_id);
  if (documentIds.length === 0) return { data: [], error: null };

  const { data, error } = await service
    .from("library_documents")
    .select(DOCUMENT_SELECT)
    .in("id", documentIds)
    .is("deleted_at", null);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as LibraryDocument[], error: null };
}
