-- LIB-01 (corregido) — Indices de soporte para el esquema REAL de Library.
-- Seguro de ejecutar: usa "if not exists", no toca RLS ni datos.

create index if not exists idx_library_folders_organizacion
  on public.library_folders (organizacion_id);

create index if not exists idx_library_folders_parent
  on public.library_folders (parent_folder_id);

create index if not exists idx_library_folders_repo
  on public.library_folders (repository_type);

create index if not exists idx_library_documents_organizacion
  on public.library_documents (organizacion_id);

create index if not exists idx_library_documents_folder
  on public.library_documents (folder_id);

create index if not exists idx_library_documents_repo
  on public.library_documents (repository_type);

create index if not exists idx_library_documents_deleted_at
  on public.library_documents (deleted_at);

create index if not exists idx_library_document_links_document
  on public.library_document_links (document_id);

create index if not exists idx_library_document_links_entity
  on public.library_document_links (entity_type, entity_id);
