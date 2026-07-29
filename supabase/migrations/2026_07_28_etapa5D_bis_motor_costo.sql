-- ============================================================
-- Etapa 5D-bis — Modelo de costo real (regenerado desde Supabase real)
-- ============================================================
-- Este archivo se generó a partir de los valores YA CARGADOS en producción
-- (no son valores nuevos). El archivo original de esta migración nunca se
-- guardó en el repo — esto lo reconstruye para que supabase/migrations/
-- vuelva a tener el historial completo. Regenerado el 29/07/2026 a partir
-- de una consulta corrida contra el Supabase real de FACILIA (ver
-- generar_migracion_5D_bis.sql en la auditoría de esa fecha).
--
-- Verificado a mano: con estos valores, Oficina 50m² a 12 visitas/mes
-- (3x/semana) da costo_ambiente_mensual = 7504.5, que coincide exacto
-- con el resultado que ya habíamos visto corriendo el motor en vivo en
-- una sesión anterior — confirma que estos son los valores reales que
-- efectivamente usa el motor hoy, no una reconstrucción aproximada.
--
-- ⚠️ Nota de la auditoría: la consulta encontró 2 opciones de FRECUENCIA
-- que no usa el wizard actual (que solo ofrece 1X_SEMANA, 2X_SEMANA,
-- 3X_SEMANA, 5X_SEMANA, DIARIO) — 'SEMANAL' y 'TRISEMANAL', ambas con
-- visitas_mes sin cargar. Parecen restos de un seed anterior a que se
-- definiera esa convención de códigos. No son peligrosas (el motor tira
-- error si alguien las selecciona, porque visitas_mes es null — falla
-- seguro), pero ensucian cualquier listado de opciones de FRECUENCIA en
-- el panel admin. Se dejan tal cual están en producción (esta migración
-- no cambia datos, solo los documenta) — desactivarlas es un cleanup
-- aparte, no se hace acá.

-- Columnas (ya sincronizadas también en supabase/schema.sql):
alter table public.cotizador_opciones add column if not exists rendimiento_m2_hora numeric;
alter table public.cotizador_opciones add column if not exists insumos_m2 numeric;
alter table public.cotizador_opciones add column if not exists frecuencia_independiente boolean not null default false;
alter table public.cotizador_opciones add column if not exists visitas_mes numeric;

-- Parámetros (valores reales actuales):
insert into public.cotizador_config (clave, valor, descripcion) values
  ('HORA_OPERARIO', 250, 'Costo de referencia por hora de operario. ⚠️ Sin confirmar si el valor actual (250) es un costo real u otro placeholder — no se usaba en ningún cálculo hasta la Etapa 5D-bis.'),
  ('MARGEN_COMERCIAL', 35, 'Margen comercial aplicado sobre el costo, en porcentaje.')
on conflict (clave) do nothing;

-- Opciones de TIPO_AMBIENTE y FRECUENCIA (valores reales actuales):
update public.cotizador_opciones set rendimiento_m2_hora = null, insumos_m2 = null, frecuencia_independiente = false, visitas_mes = 4 where codigo = '1X_SEMANA' and variable_id = (select id from public.cotizador_variables where codigo = 'FRECUENCIA');
update public.cotizador_opciones set rendimiento_m2_hora = null, insumos_m2 = null, frecuencia_independiente = false, visitas_mes = null where codigo = 'SEMANAL' and variable_id = (select id from public.cotizador_variables where codigo = 'FRECUENCIA');
update public.cotizador_opciones set rendimiento_m2_hora = null, insumos_m2 = null, frecuencia_independiente = false, visitas_mes = null where codigo = 'TRISEMANAL' and variable_id = (select id from public.cotizador_variables where codigo = 'FRECUENCIA');
update public.cotizador_opciones set rendimiento_m2_hora = null, insumos_m2 = null, frecuencia_independiente = false, visitas_mes = 8 where codigo = '2X_SEMANA' and variable_id = (select id from public.cotizador_variables where codigo = 'FRECUENCIA');
update public.cotizador_opciones set rendimiento_m2_hora = null, insumos_m2 = null, frecuencia_independiente = false, visitas_mes = 12 where codigo = '3X_SEMANA' and variable_id = (select id from public.cotizador_variables where codigo = 'FRECUENCIA');
update public.cotizador_opciones set rendimiento_m2_hora = null, insumos_m2 = null, frecuencia_independiente = false, visitas_mes = 20 where codigo = '5X_SEMANA' and variable_id = (select id from public.cotizador_variables where codigo = 'FRECUENCIA');
update public.cotizador_opciones set rendimiento_m2_hora = null, insumos_m2 = null, frecuencia_independiente = false, visitas_mes = 22 where codigo = 'DIARIO' and variable_id = (select id from public.cotizador_variables where codigo = 'FRECUENCIA');
update public.cotizador_opciones set rendimiento_m2_hora = 20.0, insumos_m2 = 0.0075, frecuencia_independiente = false, visitas_mes = null where codigo = 'OFICINA' and variable_id = (select id from public.cotizador_variables where codigo = 'TIPO_AMBIENTE');
update public.cotizador_opciones set rendimiento_m2_hora = 11.1, insumos_m2 = 0.03, frecuencia_independiente = false, visitas_mes = null where codigo = 'BANO' and variable_id = (select id from public.cotizador_variables where codigo = 'TIPO_AMBIENTE');
update public.cotizador_opciones set rendimiento_m2_hora = 13.3, insumos_m2 = 0.0225, frecuencia_independiente = false, visitas_mes = null where codigo = 'COCINA' and variable_id = (select id from public.cotizador_variables where codigo = 'TIPO_AMBIENTE');
update public.cotizador_opciones set rendimiento_m2_hora = 10.0, insumos_m2 = 0.0075, frecuencia_independiente = false, visitas_mes = null where codigo = 'AUDITORIO' and variable_id = (select id from public.cotizador_variables where codigo = 'TIPO_AMBIENTE');
update public.cotizador_opciones set rendimiento_m2_hora = 20.0, insumos_m2 = 0.0075, frecuencia_independiente = false, visitas_mes = null where codigo = 'SALA_REUNIONES' and variable_id = (select id from public.cotizador_variables where codigo = 'TIPO_AMBIENTE');
update public.cotizador_opciones set rendimiento_m2_hora = 25.0, insumos_m2 = 0.0075, frecuencia_independiente = true, visitas_mes = null where codigo = 'ESPACIOS_COMUNES' and variable_id = (select id from public.cotizador_variables where codigo = 'TIPO_AMBIENTE');
update public.cotizador_opciones set rendimiento_m2_hora = 11.1, insumos_m2 = 0.035, frecuencia_independiente = false, visitas_mes = null where codigo = 'BARBACOA' and variable_id = (select id from public.cotizador_variables where codigo = 'TIPO_AMBIENTE');