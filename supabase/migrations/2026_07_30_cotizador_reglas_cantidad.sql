-- ============================================================
-- Motor de reglas de cantidad (genérico, sin hardcodear casos)
-- ============================================================
-- Hasta ahora `cantidad_fuente` en cotizador_variables solo sabía:
--   'ninguna' | 'input_cliente' | 'cantidad_banos'
-- Eso alcanzaba para "1 por baño", pero no para reglas compuestas como
-- "1 dispensador de toallas por baño + cocina + barbacoa" o "1 jabón por
-- cada dispensador de toallas contratado". En vez de agregar un
-- cantidad_fuente nuevo por cada caso (lo que ataría el motor a casos de
-- uso puntuales que alguien tiene que pedir y programar), se agrega un
-- cuarto valor genérico: 'regla'.
--
-- Cuando cantidad_fuente = 'regla', la cantidad se calcula como la SUMA
-- de "términos" configurados en cotizador_regla_terminos, cada uno de la
-- forma (fuente × multiplicador). Las fuentes disponibles hoy:
--   'constante'             → un número fijo
--   'm2_total'               → m² totales del presupuesto
--   'personas'               → cantidad de personas (campo a futuro; si el
--                              formulario público todavía no lo pide, sale 0)
--   'conteo_tipo_ambiente'   → cuántos ambientes de un tipo eligió el cliente
--                              (tipo_ambiente = código de la opción, ej "BANO")
--   'cantidad_variable'      → la cantidad YA calculada para otro opcional
--                              (variable_referencia_id) — permite reglas
--                              encadenadas (ej. jabón = f(toallas)).
--
-- Este set de fuentes está pensado para crecer: agregar una fuente nueva
-- el día de mañana es un valor más en el check + un resolver en
-- engine.ts, no una reescritura del modelo.

alter table public.cotizador_variables drop constraint if exists cotizador_variables_cantidad_fuente_check;
alter table public.cotizador_variables
  add constraint cotizador_variables_cantidad_fuente_check
  check (cantidad_fuente in ('ninguna', 'input_cliente', 'cantidad_banos', 'regla'));

create table if not exists public.cotizador_regla_terminos (
  id uuid primary key default gen_random_uuid(),
  variable_id uuid not null references public.cotizador_variables (id) on delete cascade,
  orden int not null default 0,
  fuente text not null check (
    fuente in ('constante', 'm2_total', 'personas', 'conteo_tipo_ambiente', 'cantidad_variable')
  ),
  -- Solo se usa cuando fuente = 'conteo_tipo_ambiente': código de una
  -- opción de la variable TIPO_AMBIENTE (ej "BANO", "COCINA").
  tipo_ambiente text,
  -- Solo se usa cuando fuente = 'cantidad_variable': a qué otro opcional
  -- (cotizador_variables) hace referencia esta regla.
  variable_referencia_id uuid references public.cotizador_variables (id) on delete set null,
  -- Solo se usa cuando fuente = 'constante'.
  constante numeric not null default 1,
  multiplicador numeric not null default 1,
  created_at timestamptz not null default now(),
  actualizado_en timestamptz,
  actualizado_por uuid references public.profiles (id) on delete set null
);

create index if not exists cotizador_regla_terminos_variable_idx
  on public.cotizador_regla_terminos (variable_id);

alter table public.cotizador_regla_terminos enable row level security;

drop policy if exists "Admin gestiona cotizador_regla_terminos" on public.cotizador_regla_terminos;
create policy "Admin gestiona cotizador_regla_terminos"
  on public.cotizador_regla_terminos for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Colaborador puede ver cotizador_regla_terminos" on public.cotizador_regla_terminos;
create policy "Colaborador puede ver cotizador_regla_terminos"
  on public.cotizador_regla_terminos for select
  to authenticated
  using (public.is_admin_or_colaborador());
