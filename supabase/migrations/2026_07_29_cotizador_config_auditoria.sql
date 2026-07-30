-- ============================================================
-- Parámetros del motor — auditoría de última modificación
-- ============================================================
-- Agrega a cotizador_config quién y cuándo modificó por última vez cada
-- parámetro (HORA_OPERARIO, MARGEN_COMERCIAL, PRECIO_M2_BASE, etc.), para
-- mostrarlo en el mismo renglón en el panel admin (tab "Parámetros").
-- No pisa datos existentes: en filas ya cargadas, actualizado_en /
-- actualizado_por quedan null hasta el próximo "Guardar" de cada una.

alter table public.cotizador_config
  add column if not exists actualizado_en timestamptz;

alter table public.cotizador_config
  add column if not exists actualizado_por uuid;

-- Nombre explícito de la FK para poder pedirle a supabase-js el join
-- (profiles!cotizador_config_actualizado_por_fkey) desde el SELECT del GET.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'cotizador_config_actualizado_por_fkey'
  ) then
    alter table public.cotizador_config
      add constraint cotizador_config_actualizado_por_fkey
      foreign key (actualizado_por) references public.profiles (id) on delete set null;
  end if;
end $$;
