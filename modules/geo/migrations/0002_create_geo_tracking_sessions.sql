-- GEO-01: geo_tracking_sessions — jornadas activas de seguimiento
-- (equivalente a "Comenzar/Finalizar jornada" en GEO-04).

create table if not exists public.geo_tracking_sessions (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  device_id uuid not null references public.geo_devices (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint geo_tracking_sessions_period_check check (ended_at is null or ended_at >= started_at)
);

create index if not exists geo_tracking_sessions_persona_idx on public.geo_tracking_sessions (persona_id);
create index if not exists geo_tracking_sessions_device_idx on public.geo_tracking_sessions (device_id);
-- Acelera "findActiveByPersonaId" / "findActiveByDeviceId" (una jornada activa por vez).
create index if not exists geo_tracking_sessions_active_idx
  on public.geo_tracking_sessions (persona_id)
  where status = 'ACTIVE';

alter table public.geo_tracking_sessions enable row level security;

drop policy if exists "GEO admin gestiona sesiones" on public.geo_tracking_sessions;
create policy "GEO admin gestiona sesiones"
  on public.geo_tracking_sessions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- La propia persona inicia/finaliza su jornada (accion tipica desde la PWA,
-- con sesion de cookies — ver GEO-00 S11 sobre createClient()).
drop policy if exists "GEO persona gestiona su sesion" on public.geo_tracking_sessions;
create policy "GEO persona gestiona su sesion"
  on public.geo_tracking_sessions for all
  to authenticated
  using (persona_id = public.geo_current_persona_id())
  with check (persona_id = public.geo_current_persona_id());
