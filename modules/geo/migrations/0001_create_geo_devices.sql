-- GEO-01: geo_devices — dispositivos moviles corporativos, asociados a
-- una Persona real de public.personas (no a un "usuario" abstracto ni a
-- una organizacion — ver GEO-00 S3-S4).

create table if not exists public.geo_devices (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  device_identifier text not null unique,
  label text,
  modelo text,
  sistema_operativo text,
  navegador text,
  app_version text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE', 'LOST', 'BLOCKED', 'RETIRED')),
  last_connection_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists geo_devices_persona_idx on public.geo_devices (persona_id);
create index if not exists geo_devices_status_idx on public.geo_devices (status);

alter table public.geo_devices enable row level security;

-- Super Admin y Administrador gestionan y ven todos los dispositivos.
drop policy if exists "GEO admin gestiona dispositivos" on public.geo_devices;
create policy "GEO admin gestiona dispositivos"
  on public.geo_devices for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Una persona puede ver sus propios dispositivos.
drop policy if exists "GEO persona ve sus dispositivos" on public.geo_devices;
create policy "GEO persona ve sus dispositivos"
  on public.geo_devices for select
  to authenticated
  using (persona_id = public.geo_current_persona_id());
