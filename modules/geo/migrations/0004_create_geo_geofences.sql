-- GEO-01: geo_geofences — zonas autorizadas. external_location_id referencia
-- opcionalmente public.locaciones (sede de un cliente) sin copiar sus datos
-- (GEO-00 S4). Solo Admin/Super Admin administran y consultan geocercas: el
-- dispositivo movil no necesita leerlas directamente (GEO-04: "el
-- dispositivo solo captura", la logica de geocercas vive en el motor
-- server-side de GEO-05).

create table if not exists public.geo_geofences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('CLIENT_LOCATION', 'OFFICE', 'WAREHOUSE', 'CUSTOM')),
  external_location_id uuid references public.locaciones (id) on delete set null,
  center_latitude numeric(9, 6) not null check (center_latitude between -90 and 90),
  center_longitude numeric(9, 6) not null check (center_longitude between -180 and 180),
  radius_meters numeric not null check (radius_meters > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists geo_geofences_type_idx on public.geo_geofences (type);
create index if not exists geo_geofences_status_idx on public.geo_geofences (status);
create index if not exists geo_geofences_external_location_idx on public.geo_geofences (external_location_id);

alter table public.geo_geofences enable row level security;

drop policy if exists "GEO admin gestiona geocercas" on public.geo_geofences;
create policy "GEO admin gestiona geocercas"
  on public.geo_geofences for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
