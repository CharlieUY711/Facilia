-- ============================================================
-- FACILIA — Módulo Library (LIB-01: dominio, storage y backend)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Idempotente: se puede volver a correr sin romper nada.
--
-- Decisiones de diseño (a validar con el equipo):
--
-- 1) "repository_type" ('publica' | 'privada') es el criterio de
--    ACCESO dentro de FACILIA (quién puede ver el documento), NO
--    significa que el archivo se sirva público en internet. Ambos
--    buckets se crean privados y TODA lectura pasa por
--    GET /api/library/download/:id, que devuelve una signed URL de
--    corta duración. Igual que rrhh-documentos, nunca se expone una
--    URL pública directa de Storage.
--
-- 2) "organizacion_id" en folders/documents es un dato de
--    CATEGORIZACIÓN (a qué cliente/organización del Directorio
--    pertenece un archivo), no un tenant — FACILIA es una sola
--    instancia con roles globales (super_admin/admin/colaborador/
--    personal/usuario), no multi-organización con aislamiento total.
--    Por eso el control de acceso real es por rol (ver policies),
--    y organizacion_id es nullable + sólo se usa para filtrar.
--
-- 3) Acceso por rol (hasta que exista ACL granular en LIB-03):
--      - repositorio "publica": super_admin, admin y colaborador
--        (equipo interno) pueden ver y escribir.
--      - repositorio "privada": sólo super_admin y admin.
--    "personal" (funcionarios) y "usuario" (clientes) no tienen
--    acceso a Library en esta etapa — no estaba en el alcance de
--    LIB-00/LIB-01 y no hay ninguna pantalla de cliente que lo pida.
--
-- 4) "visibility" en library_documents queda como campo reservado
--    para el ACL fino de LIB-03 (hoy siempre espeja repository_type,
--    no se evalúa en las policies).
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Helper: ¿el usuario autenticado es staff interno? ────────────
-- (super_admin, admin o colaborador). Se usa para el repositorio
-- "publica". Para "privada" ya existe public.is_admin().
create or replace function public.is_library_staff()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('super_admin', 'admin', 'colaborador')
  );
$$ language sql security definer stable set search_path = public;

-- ── Carpetas ──────────────────────────────────────────────────────
create table if not exists public.library_folders (
  id uuid primary key default uuid_generate_v4(),
  repository_type text not null check (repository_type in ('publica', 'privada')),
  parent_folder_id uuid references public.library_folders (id) on delete cascade,
  organizacion_id uuid references public.organizaciones (id) on delete set null,
  nombre text not null,
  descripcion text,
  orden int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists library_folders_parent_idx on public.library_folders (parent_folder_id);
create index if not exists library_folders_repo_idx on public.library_folders (repository_type);
create index if not exists library_folders_org_idx on public.library_folders (organizacion_id);

-- Nombre único entre hermanas (misma carpeta padre y repositorio),
-- ignorando las eliminadas lógicamente.
create unique index if not exists library_folders_nombre_unico
  on public.library_folders (repository_type, coalesce(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(nombre))
  where deleted_at is null;

-- ── Documentos ────────────────────────────────────────────────────
create table if not exists public.library_documents (
  id uuid primary key default uuid_generate_v4(),
  organizacion_id uuid references public.organizaciones (id) on delete set null,
  folder_id uuid references public.library_folders (id) on delete set null,
  repository_type text not null check (repository_type in ('publica', 'privada')),
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  original_name text not null,
  extension text,
  mime_type text,
  file_size bigint not null check (file_size >= 0),
  title text not null,
  description text,
  visibility text not null default 'privada' check (visibility in ('publica', 'privada')),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists library_documents_folder_idx on public.library_documents (folder_id);
create index if not exists library_documents_repo_idx on public.library_documents (repository_type);
create index if not exists library_documents_org_idx on public.library_documents (organizacion_id);
create index if not exists library_documents_created_by_idx on public.library_documents (created_by);
create index if not exists library_documents_deleted_idx on public.library_documents (deleted_at);
-- Búsqueda simple por nombre/descripción (ILIKE) sin FTS por ahora.
create index if not exists library_documents_nombre_idx on public.library_documents (lower(title));

-- ── Vínculos polimórficos (documento ↔ cualquier entidad) ────────
create table if not exists public.library_document_links (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.library_documents (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (document_id, entity_type, entity_id)
);

create index if not exists library_document_links_document_idx on public.library_document_links (document_id);
create index if not exists library_document_links_entity_idx on public.library_document_links (entity_type, entity_id);

-- ── updated_at automático ─────────────────────────────────────────
create or replace function public.library_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists library_folders_set_updated_at on public.library_folders;
create trigger library_folders_set_updated_at
  before update on public.library_folders
  for each row execute function public.library_set_updated_at();

drop trigger if exists library_documents_set_updated_at on public.library_documents;
create trigger library_documents_set_updated_at
  before update on public.library_documents
  for each row execute function public.library_set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────
alter table public.library_folders enable row level security;
alter table public.library_documents enable row level security;
alter table public.library_document_links enable row level security;

drop policy if exists "Ver carpetas segun repositorio" on public.library_folders;
create policy "Ver carpetas segun repositorio"
  on public.library_folders for select
  to authenticated
  using (
    (repository_type = 'publica' and public.is_library_staff())
    or (repository_type = 'privada' and public.is_admin())
  );

drop policy if exists "Escribir carpetas segun repositorio" on public.library_folders;
create policy "Escribir carpetas segun repositorio"
  on public.library_folders for all
  to authenticated
  using (
    (repository_type = 'publica' and public.is_library_staff())
    or (repository_type = 'privada' and public.is_admin())
  )
  with check (
    (repository_type = 'publica' and public.is_library_staff())
    or (repository_type = 'privada' and public.is_admin())
  );

drop policy if exists "Ver documentos segun repositorio" on public.library_documents;
create policy "Ver documentos segun repositorio"
  on public.library_documents for select
  to authenticated
  using (
    (repository_type = 'publica' and public.is_library_staff())
    or (repository_type = 'privada' and public.is_admin())
  );

drop policy if exists "Escribir documentos segun repositorio" on public.library_documents;
create policy "Escribir documentos segun repositorio"
  on public.library_documents for all
  to authenticated
  using (
    (repository_type = 'publica' and public.is_library_staff())
    or (repository_type = 'privada' and public.is_admin())
  )
  with check (
    (repository_type = 'publica' and public.is_library_staff())
    or (repository_type = 'privada' and public.is_admin())
  );

drop policy if exists "Staff gestiona vinculos de documentos" on public.library_document_links;
create policy "Staff gestiona vinculos de documentos"
  on public.library_document_links for all
  to authenticated
  using (public.is_library_staff())
  with check (public.is_library_staff());

-- ============================================================
-- Storage: dos buckets privados. Las URLs siempre se sirven
-- firmadas desde el server (nunca públicas) — todas las subidas y
-- descargas pasan por las API routes con la Service Role Key, igual
-- que en rrhh-documentos.
--
-- En algunos planes de Supabase el usuario del SQL Editor no tiene
-- permiso para insertar en storage.buckets. Si el bloque de abajo
-- falla, creá los buckets a mano: Project → Storage → New bucket →
-- "public-library" y "private-library", ambos con Public: OFF.
-- ============================================================
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('public-library', 'public-library', false)
  on conflict (id) do nothing;
exception when others then
  raise notice 'No se pudo crear el bucket "public-library" por SQL (%). Creálo a mano desde Project → Storage.', sqlerrm;
end $$;

do $$
begin
  insert into storage.buckets (id, name, public)
  values ('private-library', 'private-library', false)
  on conflict (id) do nothing;
exception when others then
  raise notice 'No se pudo crear el bucket "private-library" por SQL (%). Creálo a mano desde Project → Storage.', sqlerrm;
end $$;
-- ============================================================
