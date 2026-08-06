-- GEO-01: geo_location_records — posiciones capturadas. Tabla de alto
-- volumen (GEO-00 S16.5): sin PostGIS, lat/lng como numeric, calculo de
-- distancia (Haversine) resuelto en la capa de aplicacion (GEO-02/05).
-- La ingesta de alto volumen desde la PWA (GEO-04) se hace preferentemente
-- con Service Role (bypassa RLS) segun la decision de GEO-00 S11; se deja
-- ademas una policy de insert propio por si se necesita ingesta con sesion
-- de cookies en escenarios de bajo volumen (ej. testing, un solo registro).

create table if not exists public.geo_location_records (
  id uuid primary key default gen_random_uuid(),
  tracking_session_id uuid not null references public.geo_tracking_sessions (id) on delete cascade,
  device_id uuid not null references public.geo_devices (id) on delete cascade,
  persona_id uuid not null references public.personas (id) on delete cascade,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  accuracy numeric not null check (accuracy >= 0),
  altitude numeric,
  speed numeric,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Consultas por dispositivo/persona en rango temporal (GEO-01 S"indices").
create index if not exists geo_location_records_device_time_idx
  on public.geo_location_records (device_id, recorded_at desc);
create index if not exists geo_location_records_persona_time_idx
  on public.geo_location_records (persona_id, recorded_at desc);
create index if not exists geo_location_records_session_idx
  on public.geo_location_records (tracking_session_id, recorded_at);

alter table public.geo_location_records enable row level security;

drop policy if exists "GEO admin ve posiciones" on public.geo_location_records;
create policy "GEO admin ve posiciones"
  on public.geo_location_records for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "GEO persona ve sus posiciones" on public.geo_location_records;
create policy "GEO persona ve sus posiciones"
  on public.geo_location_records for select
  to authenticated
  using (persona_id = public.geo_current_persona_id());

drop policy if exists "GEO persona registra su posicion" on public.geo_location_records;
create policy "GEO persona registra su posicion"
  on public.geo_location_records for insert
  to authenticated
  with check (persona_id = public.geo_current_persona_id());
