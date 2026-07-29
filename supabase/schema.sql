-- ============================================================
-- FACILIA — Esquema de base de datos (Supabase / Postgres)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Tabla de leads ────────────────────────────────────────────
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),

  -- Datos de contacto — únicos obligatorios: teléfono y email
  nombre text,
  email text not null,
  telefono text not null,
  empresa text,

  -- Datos del cotizador — un espacio puede tener varios ambientes
  -- (ej: [{"tipo_ambiente":"bano","m2":40,"usuarios":2,"luz_natural":true,"ventana":true},
  --       {"tipo_ambiente":"cocina","m2":50}])
  ambientes jsonb not null default '[]'::jsonb,
  -- Clasificación general + datos estructurales (informativos, no afectan precio)
  -- ej: {"tipo_espacio":"oficina","plantas":"3","subsuelos":"1","barbacoa_personas":"hasta_10",
  --      "turnos":"2","horario":"09:00-18:00","usuarios_totales":"40"}
  estructura jsonb default '{}'::jsonb,
  frecuencia text not null,
  opcionales jsonb default '{}'::jsonb,

  -- Resultado del cálculo (snapshot, no recalcular después)
  precio_visita numeric not null,
  precio_mensual numeric not null,
  detalle jsonb not null, -- líneas de precio + regalo de bienvenida

  -- Número de presupuesto correlativo, ej: FAC-2026-000123
  numero_presupuesto text unique,

  -- PDF generado (URL en Supabase Storage, opcional)
  pdf_url text,

  -- Estado del lead
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'contactado', 'aceptado', 'perdido')),

  notas text
);

create index if not exists leads_estado_idx on public.leads (estado);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- ── Tabla de perfiles (roles) ────────────────────────────────────
-- Se crea automáticamente (vía trigger) cada vez que alguien se registra
-- en Supabase Auth. Por defecto queda con rol "personal" (Funcionario);
-- el rol se debe ajustar manualmente para super_admin/admin/colaborador/usuario
-- (ver instrucciones al final de este archivo).
--
-- Roles disponibles:
--   super_admin  → Super Admin: acceso y configuración de todo.
--   admin        → Administrador: personal de FACILIA autorizado.
--   colaborador  → Igual acceso que admin al panel comercial de leads.
--   personal     → Funcionario: acceso a su área personal (ya existe).
--   usuario      → Cliente: acceso a sus propios presupuestos.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text,
  role text not null default 'personal'
    check (role in ('super_admin', 'admin', 'colaborador', 'personal', 'usuario')),
  created_at timestamptz not null default now()
);

-- Si la tabla ya existía de antes (sin "super_admin" en el check), esto
-- amplía la restricción sin perder datos:
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'colaborador', 'personal', 'usuario'));

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, new.raw_user_meta_data ->> 'nombre')
  on conflict (id) do nothing;

  -- Cada usuario que se registra queda también como Persona en el
  -- directorio (ver bloque "DIRECTORIO" más abajo en este archivo).
  insert into public.personas (profile_id, nombre, email, tipo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.email,
    'cliente'
  )
  on conflict (profile_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Un usuario puede ver su propio perfil" on public.profiles;
create policy "Un usuario puede ver su propio perfil"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Función security definer: evita la recursión infinita que ocurriría si
-- una policy de "profiles" hiciera un select directo sobre "profiles".
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$ language sql security definer stable set search_path = public;

-- Super Admin: acceso y configuración de todo (incluye gestionar roles
-- de otros usuarios, algo que ni admin ni colaborador pueden hacer).
create or replace function public.is_super_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  );
$$ language sql security definer stable set search_path = public;

drop policy if exists "Admin puede ver todos los perfiles" on public.profiles;
create policy "Admin puede ver todos los perfiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Super Admin y Administrador pueden modificar perfiles ajenos (ej.
-- cambiar el rol de un usuario desde /dashboard/usuarios) — con una
-- excepción: el rol "super_admin" solo lo puede otorgar o modificar
-- otro Super Admin. "using" controla qué filas puede tocar un Admin
-- (no puede editar a alguien que YA es super_admin) y "with check"
-- controla el valor nuevo (no puede convertir a nadie en super_admin).
drop policy if exists "Super admin puede actualizar cualquier perfil" on public.profiles;
drop policy if exists "Super admin y admin pueden actualizar perfiles" on public.profiles;
create policy "Super admin y admin pueden actualizar perfiles"
  on public.profiles for update
  to authenticated
  using (
    public.is_super_admin()
    or (public.is_admin() and role <> 'super_admin')
  )
  with check (
    public.is_super_admin()
    or (public.is_admin() and role <> 'super_admin')
  );

-- ── Secuencia + trigger para número de presupuesto ─────────────
create sequence if not exists presupuesto_seq start 1;

create or replace function public.set_numero_presupuesto()
returns trigger as $$
begin
  if new.numero_presupuesto is null then
    new.numero_presupuesto := 'FAC-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('presupuesto_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_numero_presupuesto on public.leads;
create trigger trg_set_numero_presupuesto
  before insert on public.leads
  for each row execute function public.set_numero_presupuesto();

-- ── Row Level Security ──────────────────────────────────────────
alter table public.leads enable row level security;

-- Solo usuarios autenticados (equipo FACILIA vía Supabase Auth) pueden
-- leer/actualizar leads desde el panel interno.
-- Solo admin y colaborador (equipo FACILIA vía Supabase Auth) pueden
-- leer/actualizar leads desde el panel interno.
create or replace function public.is_admin_or_colaborador()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'colaborador', 'super_admin')
  );
$$ language sql security definer stable set search_path = public;

drop policy if exists "Usuarios autenticados pueden ver leads" on public.leads;
drop policy if exists "Admin y colaborador pueden ver leads" on public.leads;
create policy "Admin y colaborador pueden ver leads"
  on public.leads for select
  to authenticated
  using (public.is_admin_or_colaborador());

drop policy if exists "Usuarios autenticados pueden actualizar leads" on public.leads;
drop policy if exists "Admin y colaborador pueden actualizar leads" on public.leads;
create policy "Admin y colaborador pueden actualizar leads"
  on public.leads for update
  to authenticated
  using (public.is_admin_or_colaborador());

-- Los inserts desde el cotizador público se hacen con la Service Role Key
-- (server-side, en /api/leads), por lo que no se necesita una policy de
-- insert para el rol "anon". Esto evita que cualquiera pueda escribir
-- directo a la tabla desde el browser.

-- ============================================================
-- Cómo crear tu primer usuario del panel:
-- Supabase Dashboard → Authentication → Users → Add user
-- (o vía supabase-js con supabase.auth.admin.createUser)
--
-- Al registrarse, el trigger le asigna automáticamente el rol "personal"
-- (Funcionario). Para darle otro acceso, asigná el rol correspondiente:
--
--   update public.profiles set role = 'super_admin' where email = 'tu@email.com';
--   update public.profiles set role = 'admin' where email = 'tu@email.com';
--   update public.profiles set role = 'colaborador' where email = 'otro@email.com';
--   update public.profiles set role = 'usuario' where email = 'cliente@email.com';
--
-- Roles disponibles: super_admin, admin, colaborador, personal, usuario.
--
-- Super Admin del proyecto (acceso y configuración de todo). Este update
-- es un no-op si el usuario todavía no se registró en Supabase Auth —
-- volvé a correrlo después de crear la cuenta si hace falta:
update public.profiles set role = 'super_admin' where email = 'cvaralla@gmail.com';
-- ============================================================

-- ============================================================
-- MIGRACIÓN (solo si ya tenías usuarios creados ANTES de agregar la
-- tabla profiles — el trigger solo corre para altas nuevas):
--
--   insert into public.profiles (id, email)
--   select id, email from auth.users
--   on conflict (id) do nothing;
-- ============================================================

-- ============================================================
-- MIGRACIÓN (solo si ya habías corrido una versión anterior de
-- este schema con columnas "tipo_ambiente" y "m2" sueltas):
--
--   alter table public.leads add column if not exists ambientes jsonb not null default '[]'::jsonb;
--   update public.leads
--     set ambientes = jsonb_build_array(jsonb_build_object('tipo_ambiente', tipo_ambiente, 'm2', m2))
--     where ambientes = '[]'::jsonb and tipo_ambiente is not null;
--   alter table public.leads drop column if exists tipo_ambiente;
--   alter table public.leads drop column if exists m2;
--
-- MIGRACIÓN (si ya tenías "nombre" obligatorio y "telefono" opcional —
-- ahora es al revés: solo teléfono y email son obligatorios):
--
--   alter table public.leads alter column nombre drop not null;
--   alter table public.leads alter column telefono set not null;
--   alter table public.leads add column if not exists estructura jsonb default '{}'::jsonb;
-- ============================================================

-- ============================================================
-- DIRECTORIO — Organizaciones, Locaciones, Personas
-- "Usuarios y roles" pasa a ser un directorio completo: gestiona
-- clientes, personal FACILIA, proveedores, sus sedes/locaciones y
-- los accesos (roles) de quienes tienen login.
--
-- Pueden gestionar el directorio (crear/editar/borrar y asignar
-- roles): Super Admin y Administrador. Colaborador, Funcionario y
-- Cliente no tienen acceso (ver public.is_admin() más arriba).
-- ============================================================

-- ── Organizaciones (clientes, proveedores, o la propia FACILIA) ──
create table if not exists public.organizaciones (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  tipo text not null default 'cliente'
    check (tipo in ('cliente', 'proveedor', 'interna', 'otro')),
  rut text,
  email text,
  telefono text,
  sitio_web text,
  direccion text,
  ciudad text,
  notas text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index if not exists organizaciones_nombre_idx on public.organizaciones (nombre);

-- ── Locaciones ───────────────────────────────────────────────────
-- Sedes/espacios donde efectivamente se presta el servicio de
-- limpieza. organizacion_id es OPCIONAL: una locación puede o no
-- coincidir con la dirección de una organización cliente.
create table if not exists public.locaciones (
  id uuid primary key default uuid_generate_v4(),
  organizacion_id uuid references public.organizaciones (id) on delete set null,
  nombre text not null,
  direccion text,
  ciudad text,
  tipo_espacio text,
  referencia text, -- cómo llegar / acceso al sitio (portón, piso, etc.)
  notas text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index if not exists locaciones_organizacion_idx on public.locaciones (organizacion_id);

-- ── Personas ─────────────────────────────────────────────────────
-- Todo contacto del directorio: cliente, personal FACILIA o
-- proveedor — tenga o no login todavía. profile_id se completa
-- recién cuando se le da acceso (se lo "invita"); pending_role
-- guarda qué rol se le va a asignar en ese momento.
create table if not exists public.personas (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  organizacion_id uuid references public.organizaciones (id) on delete set null,
  locacion_id uuid references public.locaciones (id) on delete set null,
  nombre text not null,
  apellido text,
  email text,
  telefono text,
  direccion text,
  cargo text,
  tipo text not null default 'cliente'
    check (tipo in ('cliente', 'personal_facilia', 'proveedor', 'otro')),
  pending_role text
    check (pending_role in ('super_admin', 'admin', 'colaborador', 'personal', 'usuario')),
  notas text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index if not exists personas_organizacion_idx on public.personas (organizacion_id);
create index if not exists personas_locacion_idx on public.personas (locacion_id);

-- ── RLS: solo Super Admin y Admin gestionan el directorio ────────
alter table public.organizaciones enable row level security;
alter table public.locaciones enable row level security;
alter table public.personas enable row level security;

drop policy if exists "Admin gestiona organizaciones" on public.organizaciones;
create policy "Admin gestiona organizaciones"
  on public.organizaciones for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin gestiona locaciones" on public.locaciones;
create policy "Admin gestiona locaciones"
  on public.locaciones for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin gestiona personas" on public.personas;
create policy "Admin gestiona personas"
  on public.personas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- MIGRACIÓN (solo si ya habías corrido una versión anterior de este
-- schema, con las tablas de directorio ya creadas — "create table if
-- not exists" no agrega columnas a una tabla que ya existe):
--
--   alter table public.personas add column if not exists apellido text;
--   alter table public.personas add column if not exists direccion text;
--   alter table public.organizaciones add column if not exists sitio_web text;
--   alter table public.organizaciones add column if not exists ciudad text;
--   alter table public.locaciones add column if not exists referencia text;
-- ============================================================

-- ── Backfill: crea una Persona para cada profile que ya existía
-- antes de este cambio (idempotente, no duplica en re-ejecuciones) ──
insert into public.personas (profile_id, nombre, email, tipo)
select
  p.id,
  coalesce(p.nombre, split_part(p.email, '@', 1)),
  p.email,
  case when p.role = 'usuario' then 'cliente' else 'personal_facilia' end
from public.profiles p
on conflict (profile_id) do nothing;
-- ============================================================

-- ============================================================
-- COTIZADOR — Motor de cálculo configurable
-- Variables, opciones, parámetros y adicionales que definen cómo se
-- arma un presupuesto, sin tocar código. Gestión: Super Admin y
-- Administrador (public.is_admin()). Lectura desde el panel interno:
-- también Colaborador (public.is_admin_or_colaborador()). La lectura
-- desde el cotizador público (/api/cotizador/config) se hace con la
-- Service Role Key (server-side), por lo que no necesita policy de
-- "anon".
-- ============================================================

-- ── Variables del cotizador (ej: TIPO_AMBIENTE, FRECUENCIA) ──────
create table if not exists public.cotizador_variables (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  codigo text not null unique,
  tipo text not null default 'select'
    check (tipo in ('select', 'select_repetible', 'select_cantidad', 'number', 'boolean', 'text', 'formula')),
  orden int not null default 0,
  obligatorio boolean not null default false,
  afecta_precio boolean not null default true,
  activo boolean not null default true,
  descripcion text,
  -- Etapa 5G — de dónde saca el motor la cantidad que multiplica a
  -- precio_fijo en variables de opcionales. Ver lib/cotizador/engine.ts.
  cantidad_fuente text not null default 'ninguna'
    check (cantidad_fuente in ('ninguna', 'input_cliente', 'cantidad_banos')),
  unidad_cantidad text,
  cantidad_min integer,
  cantidad_max integer,
  created_at timestamptz not null default now()
);

-- La tabla puede haberse creado antes con menos columnas (por eso el
-- "create table if not exists" de arriba no alcanza) — esto agrega
-- lo que falte sin tocar los datos existentes.
alter table public.cotizador_variables add column if not exists orden int not null default 0;
alter table public.cotizador_variables add column if not exists obligatorio boolean not null default false;
alter table public.cotizador_variables add column if not exists afecta_precio boolean not null default true;
alter table public.cotizador_variables add column if not exists activo boolean not null default true;
alter table public.cotizador_variables add column if not exists descripcion text;
alter table public.cotizador_variables add column if not exists cantidad_fuente text not null default 'ninguna';
alter table public.cotizador_variables add column if not exists unidad_cantidad text;
alter table public.cotizador_variables add column if not exists cantidad_min integer;
alter table public.cotizador_variables add column if not exists cantidad_max integer;
alter table public.cotizador_variables add column if not exists created_at timestamptz not null default now();

-- Recrea los checks explícitamente (no alcanza con "create table if not
-- exists" si la tabla ya existía de antes con un check distinto — es
-- justo lo que pasó una vez con cotizador_extras.tipo_calculo, ver
-- Etapa 5G, migración 2026_07_28_etapa5G_opcionales_variables.sql).
alter table public.cotizador_variables drop constraint if exists cotizador_variables_tipo_check;
alter table public.cotizador_variables
  add constraint cotizador_variables_tipo_check
  check (tipo in ('select', 'select_repetible', 'select_cantidad', 'number', 'boolean', 'text', 'formula'));

alter table public.cotizador_variables drop constraint if exists cotizador_variables_cantidad_fuente_check;
alter table public.cotizador_variables
  add constraint cotizador_variables_cantidad_fuente_check
  check (cantidad_fuente in ('ninguna', 'input_cliente', 'cantidad_banos'));

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    where tc.table_schema = 'public' and tc.table_name = 'cotizador_variables'
      and tc.constraint_type = 'UNIQUE' and ccu.column_name = 'codigo'
  ) then
    alter table public.cotizador_variables add constraint cotizador_variables_codigo_key unique (codigo);
  end if;
end $$;

create index if not exists cotizador_variables_orden_idx on public.cotizador_variables (orden);

-- ── Opciones de cada variable (ej: OFICINA factor 1, BAÑO factor 1.8) ──
create table if not exists public.cotizador_opciones (
  id uuid primary key default uuid_generate_v4(),
  variable_id uuid not null references public.cotizador_variables (id) on delete cascade,
  nombre text not null,
  codigo text not null,
  factor numeric not null default 1,
  precio_fijo numeric,
  orden int not null default 0,
  activo boolean not null default true,
  -- Etapa 5D-bis — modelo de costo real (solo tienen sentido en opciones
  -- de la variable TIPO_AMBIENTE). Ver lib/cotizador/engine.ts.
  rendimiento_m2_hora numeric,
  insumos_m2 numeric,
  frecuencia_independiente boolean not null default false,
  -- Etapa 5D-bis — solo tiene sentido en opciones de la variable FRECUENCIA.
  visitas_mes numeric,
  created_at timestamptz not null default now(),
  unique (variable_id, codigo)
);

-- Igual que arriba: agrega columnas que puedan faltar si la tabla ya
-- existía de antes.
alter table public.cotizador_opciones add column if not exists precio_fijo numeric;
alter table public.cotizador_opciones add column if not exists orden int not null default 0;
alter table public.cotizador_opciones add column if not exists activo boolean not null default true;
alter table public.cotizador_opciones add column if not exists rendimiento_m2_hora numeric;
alter table public.cotizador_opciones add column if not exists insumos_m2 numeric;
alter table public.cotizador_opciones add column if not exists frecuencia_independiente boolean not null default false;
alter table public.cotizador_opciones add column if not exists visitas_mes numeric;
alter table public.cotizador_opciones add column if not exists created_at timestamptz not null default now();

do $$
begin
  begin
    alter table public.cotizador_opciones
      add constraint cotizador_opciones_variable_id_codigo_key unique (variable_id, codigo);
  exception when duplicate_table or duplicate_object then null;
  end;
end $$;

create index if not exists cotizador_opciones_variable_idx on public.cotizador_opciones (variable_id);

-- ── Parámetros globales del motor (ej: PRECIO_M2_BASE, MARGEN_COMERCIAL) ──
create table if not exists public.cotizador_config (
  id uuid primary key default uuid_generate_v4(),
  clave text not null unique,
  valor numeric not null,
  descripcion text,
  created_at timestamptz not null default now()
);

alter table public.cotizador_config add column if not exists descripcion text;
alter table public.cotizador_config add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    where tc.table_schema = 'public' and tc.table_name = 'cotizador_config'
      and tc.constraint_type = 'UNIQUE' and ccu.column_name = 'clave'
  ) then
    alter table public.cotizador_config add constraint cotizador_config_clave_key unique (clave);
  end if;
end $$;

-- ── Servicios adicionales (ej: limpieza de vidrios, sanitización) ──
create table if not exists public.cotizador_extras (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  codigo text not null unique,
  tipo_calculo text not null default 'fixed'
    check (tipo_calculo in ('fixed', 'percentage', 'formula')),
  valor numeric not null default 0,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cotizador_extras add column if not exists orden int not null default 0;
alter table public.cotizador_extras add column if not exists activo boolean not null default true;
alter table public.cotizador_extras add column if not exists created_at timestamptz not null default now();

-- Recrea el check explícitamente — ver nota en el bloque de
-- cotizador_variables más arriba: esto es lo que faltaba la primera vez
-- que se corrió la migración 5G y causó el rollback completo.
alter table public.cotizador_extras drop constraint if exists cotizador_extras_tipo_calculo_check;
alter table public.cotizador_extras
  add constraint cotizador_extras_tipo_calculo_check
  check (tipo_calculo in ('fixed', 'percentage', 'formula'));

-- ── RLS ────────────────────────────────────────────────────────
alter table public.cotizador_variables enable row level security;
alter table public.cotizador_opciones enable row level security;
alter table public.cotizador_config enable row level security;
alter table public.cotizador_extras enable row level security;

drop policy if exists "Admin gestiona cotizador_variables" on public.cotizador_variables;
create policy "Admin gestiona cotizador_variables"
  on public.cotizador_variables for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Colaborador puede ver cotizador_variables" on public.cotizador_variables;
create policy "Colaborador puede ver cotizador_variables"
  on public.cotizador_variables for select
  to authenticated
  using (public.is_admin_or_colaborador());

drop policy if exists "Admin gestiona cotizador_opciones" on public.cotizador_opciones;
create policy "Admin gestiona cotizador_opciones"
  on public.cotizador_opciones for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Colaborador puede ver cotizador_opciones" on public.cotizador_opciones;
create policy "Colaborador puede ver cotizador_opciones"
  on public.cotizador_opciones for select
  to authenticated
  using (public.is_admin_or_colaborador());

drop policy if exists "Admin gestiona cotizador_config" on public.cotizador_config;
create policy "Admin gestiona cotizador_config"
  on public.cotizador_config for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Colaborador puede ver cotizador_config" on public.cotizador_config;
create policy "Colaborador puede ver cotizador_config"
  on public.cotizador_config for select
  to authenticated
  using (public.is_admin_or_colaborador());

drop policy if exists "Admin gestiona cotizador_extras" on public.cotizador_extras;
create policy "Admin gestiona cotizador_extras"
  on public.cotizador_extras for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Colaborador puede ver cotizador_extras" on public.cotizador_extras;
create policy "Colaborador puede ver cotizador_extras"
  on public.cotizador_extras for select
  to authenticated
  using (public.is_admin_or_colaborador());

-- ── Datos semilla (idempotente vía ON CONFLICT) ──────────────────
-- Variable: TIPO_AMBIENTE
insert into public.cotizador_variables (nombre, codigo, tipo, orden, obligatorio, afecta_precio, descripcion)
values ('Tipo de ambiente', 'TIPO_AMBIENTE', 'select_repetible', 1, true, true,
        'Ambientes del espacio a limpiar. El cliente puede agregar varios ambientes del mismo tipo con distinta superficie.')
on conflict (codigo) do nothing;

insert into public.cotizador_opciones (variable_id, nombre, codigo, factor, orden)
select v.id, o.nombre, o.codigo, o.factor, o.orden
from public.cotizador_variables v
cross join (values
  ('Oficina', 'OFICINA', 1.0, 1),
  ('Baño', 'BANO', 1.8, 2),
  ('Cocina', 'COCINA', 1.5, 3),
  ('Auditorio', 'AUDITORIO', 2.0, 4)
) as o(nombre, codigo, factor, orden)
where v.codigo = 'TIPO_AMBIENTE'
on conflict (variable_id, codigo) do nothing;

-- Variable: FRECUENCIA
insert into public.cotizador_variables (nombre, codigo, tipo, orden, obligatorio, afecta_precio, descripcion)
values ('Frecuencia', 'FRECUENCIA', 'select', 2, true, true, 'Cantidad de veces por semana que se presta el servicio.')
on conflict (codigo) do nothing;

insert into public.cotizador_opciones (variable_id, nombre, codigo, factor, orden)
select v.id, o.nombre, o.codigo, o.factor, o.orden
from public.cotizador_variables v
cross join (values
  ('1 vez por semana', '1X_SEMANA', 1.0, 1),
  ('2 veces por semana', '2X_SEMANA', 2.0, 2),
  ('3 veces por semana', '3X_SEMANA', 3.0, 3),
  ('5 veces por semana', '5X_SEMANA', 5.0, 4),
  ('Diario', 'DIARIO', 6.0, 5)
) as o(nombre, codigo, factor, orden)
where v.codigo = 'FRECUENCIA'
on conflict (variable_id, codigo) do nothing;

-- Parámetros globales
insert into public.cotizador_config (clave, valor, descripcion) values
  ('PRECIO_M2_BASE', 1.20, 'Precio base por m² ponderado, antes de margen.'),
  ('HORA_OPERARIO', 250, 'Costo de referencia por hora de operario.'),
  ('MARGEN_COMERCIAL', 35, 'Margen comercial aplicado sobre el costo, en porcentaje.')
on conflict (clave) do nothing;
-- ============================================================
