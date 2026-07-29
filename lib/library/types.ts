// Tipos compartidos del módulo Library — usados por las API routes
// (app/api/library/**) y, en LIB-02, por los componentes de UI.

export type RepositoryType = "publica" | "privada";

export interface RefMini {
  id: string;
  nombre: string;
}

export interface PerfilMini {
  id: string;
  email: string | null;
}

export interface LibraryFolder {
  id: string;
  repository_type: RepositoryType;
  parent_folder_id: string | null;
  organizacion_id: string | null;
  nombre: string;
  descripcion: string | null;
  orden: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  organizaciones?: RefMini | null;
}

export interface LibraryDocument {
  id: string;
  organizacion_id: string | null;
  folder_id: string | null;
  repository_type: RepositoryType;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  original_name: string;
  extension: string | null;
  mime_type: string | null;
  file_size: number;
  title: string;
  description: string | null;
  visibility: RepositoryType;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  organizaciones?: RefMini | null;
  creador?: PerfilMini | null;
}

export interface LibraryDocumentLink {
  id: string;
  document_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  created_by: string | null;
}

export interface CreateFolderInput {
  repository_type: RepositoryType;
  parent_folder_id: string | null;
  organizacion_id: string | null;
  nombre: string;
  descripcion: string | null;
}

export interface UpdateFolderInput {
  nombre?: string;
  descripcion?: string | null;
  parent_folder_id?: string | null;
  orden?: number;
}

export interface UploadDocumentInput {
  repository_type: RepositoryType;
  folder_id: string | null;
  organizacion_id: string | null;
  title: string | null;
  description: string | null;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string | null;
  folder_id?: string | null;
  organizacion_id?: string | null;
}

export interface DocumentFilters {
  repository_type?: RepositoryType;
  folder_id?: string | null;
  q?: string;
  extension?: string;
  mime_type?: string;
  organizacion_id?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type ApiResult<T extends Record<string, unknown> = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };
