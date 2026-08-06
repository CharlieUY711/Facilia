-- GEO-01: geo_presence_events — eventos ENTER/EXIT/STAY generados por el
-- motor de geocercas (GEO-05), nunca por el dispositivo directamente. Por
-- eso no hay policy de insert para personas: solo Admin (o, en la
-- practica, el Service Role usado por el motor, que bypassa RLS).

create table if not exists public.geo_presence_events (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  device_id uuid not null references public.geo_devices (id) on delete cascade,
  geofence_id uuid not null references public.geo_geofences (id) on delete cascade,
  tracking_session_id uuid not null references public.geo_tracking_sessions (id) on delete cascade,
  location_record_id uuid references public.geo_location_records (id) on delete set null,
  event_type text not null check (event_type in ('ENTER', 'EXIT', 'STAY', 'UNKNOWN')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists geo_presence_events_persona_time_idx
  on public.geo_presence_events (persona_id, occurred_at desc);
create index if not exists geo_presence_events_geofence_time_idx
  on public.geo_presence_events (geofence_id, occurred_at desc);
create index if not exists geo_presence_events_session_idx
  on public.geo_presence_events (tracking_session_id);

alter table public.geo_presence_events enable row level security;

drop policy if exists "GEO admin gestiona eventos de presencia" on public.geo_presence_events;
create policy "GEO admin gestiona eventos de presencia"
  on public.geo_presence_events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "GEO persona ve sus eventos de presencia" on public.geo_presence_events;
create policy "GEO persona ve sus eventos de presencia"
  on public.geo_presence_events for select
  to authenticated
  using (persona_id = public.geo_current_persona_id());
