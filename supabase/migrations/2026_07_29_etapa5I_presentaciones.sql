-- ============================================================
-- Etapa 5I — Presentaciones (segunda dimensión bajo cada Opción)
--            + Accesorio por insumo
-- ============================================================
-- Contexto: el cliente quiere un formato tipo planilla para Insumos /
-- Electrodomésticos / Vajilla con esta jerarquía:
--   Insumo (cotizador_variables, ya existe)
--     └─ Opción (cotizador_opciones, ya existe — Standard/Premium/Ultra Premium)
--          └─ Presentación (NUEVO — ej. "Salus 20lts"), con valor y factor.
--              Costo mensual = valor × factor. El "factor" es manual (o
--              viene de otro lado en el futuro), no se calcula solo.
--   Un Insumo puede además apuntar a un Accesorio (otra variable, del
--   bloque Electrodomésticos — ej. Agua → Dispensador).
--
-- No se toca cotizador_variables.tipo ni cotizador_opciones — ambas ya
-- alcanzan para Insumo y Opción. Solo se agrega la tabla de Presentación
-- y la referencia de Accesorio.
--
-- RLS: mismo patrón que cotizador_variables/cotizador_opciones en
-- schema.sql (public.is_admin() para escritura, public.is_admin_or_colaborador()
-- para lectura desde el panel).
--
-- ⚠️ Igual que en etapas anteriores: esta migración NO carga valor/factor
-- reales todavía, solo crea la estructura. Los datos (Agua/Salus/20lts,
-- etc.) se cargan después desde el panel admin.

-- ── 1. Accesorio: un insumo puede apuntar a otra variable (electrodoméstico) ──

alter table public.cotizador_variables
  add column if not exists accesorio_variable_id uuid references public.cotizador_variables (id) on delete set null;

-- ── 2. Presentaciones — nueva tabla, una por combinación Opción + Presentación ──

create table if not exists public.cotizador_presentaciones (
  id uuid primary key default gen_random_uuid(),
  opcion_id uuid not null references public.cotizador_opciones (id) on delete cascade,
  nombre text not null,          -- ej. "Salus 20lts"
  codigo text not null,          -- ej. "SALUS_20L"
  valor numeric not null default 0,
  factor numeric not null default 1,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (opcion_id, codigo)
);

create index if not exists cotizador_presentaciones_opcion_idx
  on public.cotizador_presentaciones (opcion_id);

-- ── 3. RLS — mismo patrón que el resto de las tablas del cotizador ──

alter table public.cotizador_presentaciones enable row level security;

drop policy if exists "Admin gestiona cotizador_presentaciones" on public.cotizador_presentaciones;
create policy "Admin gestiona cotizador_presentaciones"
  on public.cotizador_presentaciones for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Colaborador puede ver cotizador_presentaciones" on public.cotizador_presentaciones;
create policy "Colaborador puede ver cotizador_presentaciones"
  on public.cotizador_presentaciones for select
  to authenticated
  using (public.is_admin_or_colaborador());
