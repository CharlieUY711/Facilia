-- LIB-01: library_documents
create table if not exists public.library_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  repository_type text not null check (repository_type in ('PUBLIC', 'PRIVATE')),
  folder_id uuid null references public.library_folders(id) on delete set null,
  storage_bucket text not null check (storage_bucket in ('public-library', 'private-library')),
  storage_path text not null,
  file_name text not null,
  original_name text not null,
  extension text not null,
  mime_type text not null,
  file_size bigint not null check (file_size >= 0),
  title text not null,
  description text null,
  visibility text not null check (visibility in ('PUBLIC', 'PRIVATE')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DELETED')),
  created_by uuid not null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_library_documents_org on public.library_documents(organization_id);
create index if not exists idx_library_documents_folder on public.library_documents(folder_id);
create index if not exists idx_library_documents_repo on public.library_documents(repository_type);
create index if not exists idx_library_documents_status on public.library_documents(status);

alter table public.library_documents enable row level security;

create policy library_documents_org_isolation
  on public.library_documents
  using (
    (repository_type = 'PUBLIC' and status = 'ACTIVE')
    or organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );
