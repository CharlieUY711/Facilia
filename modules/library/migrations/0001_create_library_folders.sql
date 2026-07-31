-- LIB-01: library_folders
create extension if not exists "pgcrypto";

create table if not exists public.library_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  repository_type text not null check (repository_type in ('PUBLIC', 'PRIVATE')),
  parent_folder_id uuid null references public.library_folders(id) on delete cascade,
  name text not null,
  description text null,
  sort_order integer not null default 0,
  created_by uuid not null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_library_folders_org on public.library_folders(organization_id);
create index if not exists idx_library_folders_parent on public.library_folders(parent_folder_id);
create index if not exists idx_library_folders_repo on public.library_folders(repository_type);

alter table public.library_folders enable row level security;

create policy library_folders_org_isolation
  on public.library_folders
  using (
    repository_type = 'PUBLIC'
    or organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );
