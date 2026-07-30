-- ============================================================
-- Parámetros con precio — auditoría también en Adicionales y Opciones
-- ============================================================
-- Mismo patrón que 2026_07_29_cotizador_config_auditoria.sql, pero para
-- las otras dos tablas que también guardan valores en pesos y que ahora
-- se gestionan desde la vista "Parámetros" del panel admin:
--   - cotizador_extras: adicionales/add-ons (antes solo por SQL directo).
--   - cotizador_opciones: precio_fijo de cada opción (vajilla, consumibles,
--     ambientes, etc.) — ya se editaba desde el panel (tab Variables), esto
--     solo agrega quién/cuándo lo tocó por última vez.
-- No pisa datos existentes: en filas ya cargadas, actualizado_en /
-- actualizado_por quedan null hasta el próximo "Guardar" de cada una.

alter table public.cotizador_extras
  add column if not exists actualizado_en timestamptz;
alter table public.cotizador_extras
  add column if not exists actualizado_por uuid;

alter table public.cotizador_opciones
  add column if not exists actualizado_en timestamptz;
alter table public.cotizador_opciones
  add column if not exists actualizado_por uuid;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'cotizador_extras_actualizado_por_fkey'
  ) then
    alter table public.cotizador_extras
      add constraint cotizador_extras_actualizado_por_fkey
      foreign key (actualizado_por) references public.profiles (id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'cotizador_opciones_actualizado_por_fkey'
  ) then
    alter table public.cotizador_opciones
      add constraint cotizador_opciones_actualizado_por_fkey
      foreign key (actualizado_por) references public.profiles (id) on delete set null;
  end if;
end $$;
