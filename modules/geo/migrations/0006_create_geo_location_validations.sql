-- GEO-01: geo_location_validations — resultado de cruzar horario planificado
-- (si hay una tarea referenciada) contra la presencia real detectada.
-- task_type/task_id reemplazan al "WorkOrder" del prompt original (GEO-00
-- S7): sin FK real porque WORK_ORDER todavia no tiene tabla destino; la
-- consistencia de task_id (ej. que exista en rrhh_tareas cuando
-- task_type='RRHH_TAREA') se valida en la capa de aplicacion, no en SQL.

create table if not exists public.geo_location_validations (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  geofence_id uuid references public.geo_geofences (id) on delete set null,
  task_type text not null default 'NONE' check (task_type in ('NONE', 'RRHH_TAREA', 'WORK_ORDER')),
  task_id uuid,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_arrival timestamptz,
  actual_departure timestamptz,
  result text not null default 'PENDING' check (result in ('VALIDATED', 'PARTIAL', 'FAILED', 'PENDING')),
  time_difference_minutes integer,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint geo_location_validations_task_check check (
    (task_type = 'NONE' and task_id is null) or (task_type <> 'NONE' and task_id is not null)
  )
);

create index if not exists geo_location_validations_persona_time_idx
  on public.geo_location_validations (persona_id, created_at desc);
create index if not exists geo_location_validations_task_idx
  on public.geo_location_validations (task_type, task_id);

alter table public.geo_location_validations enable row level security;

drop policy if exists "GEO admin gestiona validaciones" on public.geo_location_validations;
create policy "GEO admin gestiona validaciones"
  on public.geo_location_validations for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "GEO persona ve sus validaciones" on public.geo_location_validations;
create policy "GEO persona ve sus validaciones"
  on public.geo_location_validations for select
  to authenticated
  using (persona_id = public.geo_current_persona_id());
