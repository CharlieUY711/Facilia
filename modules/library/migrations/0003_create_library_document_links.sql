-- LIB-01: library_document_links (tabla polimorfica de integracion transversal)
create table if not exists public.library_document_links (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.library_documents(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint uq_library_document_links unique (document_id, entity_type, entity_id)
);

create index if not exists idx_library_document_links_document on public.library_document_links(document_id);
create index if not exists idx_library_document_links_entity on public.library_document_links(entity_type, entity_id);

alter table public.library_document_links enable row level security;

create policy library_document_links_read
  on public.library_document_links
  for select
  using (
    exists (
      select 1 from public.library_documents d
      where d.id = document_id
        and (
          (d.repository_type = 'PUBLIC' and d.status = 'ACTIVE')
          or d.organization_id = (auth.jwt() ->> 'organization_id')::uuid
        )
    )
  );
