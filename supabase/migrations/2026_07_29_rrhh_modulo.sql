-- ============================================================
-- FACILIA — Módulo de Personal (RRHH)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Idempotente: se puede volver a correr sin romper nada.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Datos legales sobre la Persona ya existente ─────────────────
-- No creamos una tabla nueva de "empleados": el legajo cuelga de
-- public.personas (misma persona que ya vive en el Directorio).
alter table public.personas add column if not exists documento text;
alter table public.personas add column if not exists fecha_nacimiento date;
alter table public.personas add column if not exists fecha_ingreso date;
alter table public.personas add column if not exists fecha_egreso date;
alter table public.personas add column if not exists tipo_contrato text;
alter table public.personas add column if not exists salario numeric;
alter table public.personas add column if not exists estado_laboral text not null default 'activo';

alter table public.personas drop constraint if exists personas_tipo_contrato_check;
alter table public.personas add constraint personas_tipo_contrato_check
  check (tipo_contrato is null or tipo_contrato in ('indefinido', 'plazo_fijo', 'pasantia', 'honorarios', 'otro'));

alter table public.personas drop constraint if exists personas_estado_laboral_check;
alter table public.personas add constraint personas_estado_laboral_check
  check (estado_laboral in ('activo', 'inactivo', 'licencia'));

-- ── Legal: documentos del legajo ─────────────────────────────────
-- categoria "empresa": los carga y anula solo Admin (contrato,
-- certificados). categoria "personal": los sube el propio
-- colaborador o cualquiera con acceso (cédula, etc.).
-- estado: "vigente" (con archivo), "pendiente_firma" / "pendiente_completar"
-- (Admin le pidió acción al colaborador y todavía no la resolvió),
-- "anulado" (Admin lo dio de baja).
create table if not exists public.rrhh_documentos (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  categoria text not null check (categoria in ('empresa', 'personal')),
  nombre text not null,
  tipo text,
  storage_path text,
  estado text not null default 'vigente'
    check (estado in ('vigente', 'pendiente_firma', 'pendiente_completar', 'anulado')),
  vencimiento date,
  notas text,
  subido_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  resuelto_at timestamptz
);

create index if not exists rrhh_documentos_persona_idx on public.rrhh_documentos (persona_id);

-- ── Evolución: asistencias por día ───────────────────────────────
create table if not exists public.rrhh_asistencias (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  fecha date not null,
  estado text not null check (estado in ('presente', 'tarde', 'ausente', 'licencia')),
  notas text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (persona_id, fecha)
);

create index if not exists rrhh_asistencias_persona_idx on public.rrhh_asistencias (persona_id);

-- ── Evolución: haberes liquidados por mes ────────────────────────
create table if not exists public.rrhh_haberes (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  anio int not null,
  mes int not null check (mes between 1 and 12),
  monto numeric not null,
  detalle jsonb not null default '{}'::jsonb,
  pagado_at date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (persona_id, anio, mes)
);

create index if not exists rrhh_haberes_persona_idx on public.rrhh_haberes (persona_id);

-- ── Tareas: instrucciones diarias ─────────────────────────────────
create table if not exists public.rrhh_tareas (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  locacion_id uuid references public.locaciones (id) on delete set null,
  titulo text not null,
  descripcion text,
  fecha date,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_curso', 'completada')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  completada_at timestamptz
);

create index if not exists rrhh_tareas_persona_idx on public.rrhh_tareas (persona_id);
create index if not exists rrhh_tareas_locacion_idx on public.rrhh_tareas (locacion_id);

-- ── Comunicados: a todo el equipo o a una persona puntual ────────
create table if not exists public.rrhh_comunicados (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  cuerpo text not null,
  para_todos boolean not null default false,
  persona_id uuid references public.personas (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint rrhh_comunicados_destino_check check (
    (para_todos and persona_id is null) or (not para_todos and persona_id is not null)
  )
);

create index if not exists rrhh_comunicados_persona_idx on public.rrhh_comunicados (persona_id);

create table if not exists public.rrhh_comunicados_lecturas (
  id uuid primary key default uuid_generate_v4(),
  comunicado_id uuid not null references public.rrhh_comunicados (id) on delete cascade,
  persona_id uuid not null references public.personas (id) on delete cascade,
  leido_at timestamptz not null default now(),
  unique (comunicado_id, persona_id)
);

-- ── RLS ───────────────────────────────────────────────────────────
-- NOTA (pendiente charlado con el equipo): estas policies usan los
-- checks fijos que ya existían (is_admin(), is_admin_or_colaborador(),
-- is_own_persona()). Cuando se construya la tabla de permisos más
-- granular, este es el punto exacto a reemplazar — no hace falta
-- tocar nada más del esquema de RRHH.

create or replace function public.is_own_persona(p_persona_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.personas
    where id = p_persona_id and profile_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

alter table public.rrhh_documentos enable row level security;
alter table public.rrhh_asistencias enable row level security;
alter table public.rrhh_haberes enable row level security;
alter table public.rrhh_tareas enable row level security;
alter table public.rrhh_comunicados enable row level security;
alter table public.rrhh_comunicados_lecturas enable row level security;

drop policy if exists "Admin gestiona documentos rrhh" on public.rrhh_documentos;
create policy "Admin gestiona documentos rrhh"
  on public.rrhh_documentos for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Colaborador ve sus documentos" on public.rrhh_documentos;
create policy "Colaborador ve sus documentos"
  on public.rrhh_documentos for select
  to authenticated
  using (public.is_own_persona(persona_id));

drop policy if exists "Colaborador sube documentos personales" on public.rrhh_documentos;
create policy "Colaborador sube documentos personales"
  on public.rrhh_documentos for insert
  to authenticated
  with check (public.is_own_persona(persona_id) and categoria = 'personal');

drop policy if exists "Colaborador resuelve pendientes propios" on public.rrhh_documentos;
create policy "Colaborador resuelve pendientes propios"
  on public.rrhh_documentos for update
  to authenticated
  using (public.is_own_persona(persona_id))
  with check (public.is_own_persona(persona_id));

drop policy if exists "Admin gestiona asistencias" on public.rrhh_asistencias;
create policy "Admin gestiona asistencias"
  on public.rrhh_asistencias for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Colaborador ve sus asistencias" on public.rrhh_asistencias;
create policy "Colaborador ve sus asistencias"
  on public.rrhh_asistencias for select
  to authenticated
  using (public.is_own_persona(persona_id));

drop policy if exists "Admin gestiona haberes" on public.rrhh_haberes;
create policy "Admin gestiona haberes"
  on public.rrhh_haberes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Colaborador ve sus haberes" on public.rrhh_haberes;
create policy "Colaborador ve sus haberes"
  on public.rrhh_haberes for select
  to authenticated
  using (public.is_own_persona(persona_id));

drop policy if exists "Admin gestiona tareas" on public.rrhh_tareas;
create policy "Admin gestiona tareas"
  on public.rrhh_tareas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Colaborador ve y actualiza sus tareas" on public.rrhh_tareas;
create policy "Colaborador ve y actualiza sus tareas"
  on public.rrhh_tareas for select
  to authenticated
  using (public.is_own_persona(persona_id));

drop policy if exists "Colaborador cambia estado de sus tareas" on public.rrhh_tareas;
create policy "Colaborador cambia estado de sus tareas"
  on public.rrhh_tareas for update
  to authenticated
  using (public.is_own_persona(persona_id))
  with check (public.is_own_persona(persona_id));

drop policy if exists "Admin gestiona comunicados" on public.rrhh_comunicados;
create policy "Admin gestiona comunicados"
  on public.rrhh_comunicados for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Colaborador ve sus comunicados" on public.rrhh_comunicados;
create policy "Colaborador ve sus comunicados"
  on public.rrhh_comunicados for select
  to authenticated
  using (para_todos or public.is_own_persona(persona_id));

drop policy if exists "Admin ve lecturas de comunicados" on public.rrhh_comunicados_lecturas;
create policy "Admin ve lecturas de comunicados"
  on public.rrhh_comunicados_lecturas for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Colaborador marca sus lecturas" on public.rrhh_comunicados_lecturas;
create policy "Colaborador marca sus lecturas"
  on public.rrhh_comunicados_lecturas for all
  to authenticated
  using (public.is_own_persona(persona_id))
  with check (public.is_own_persona(persona_id));

-- ============================================================
-- Storage: bucket privado para los archivos del legajo.
-- Las URLs siempre se sirven firmadas desde el server (nunca
-- públicas) — por eso no hace falta agregar policies de Storage:
-- todas las subidas y descargas pasan por las API routes con la
-- Service Role Key.
--
-- En algunos planes de Supabase el usuario del SQL Editor no tiene
-- permiso para insertar en storage.buckets. Si el bloque de abajo
-- falla, creá el bucket a mano: Project → Storage → New bucket →
-- nombre "rrhh-documentos", Public: OFF.
-- ============================================================
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('rrhh-documentos', 'rrhh-documentos', false)
  on conflict (id) do nothing;
exception when others then
  raise notice 'No se pudo crear el bucket "rrhh-documentos" por SQL (%). Creálo a mano desde Project → Storage.', sqlerrm;
end $$;
-- ============================================================
