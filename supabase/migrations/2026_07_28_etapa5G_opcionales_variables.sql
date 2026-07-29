-- ============================================================
-- Etapa 5G — Opcionales del cotizador como cotizador_variables
-- ============================================================
-- Contexto (ver prompt de continuación post 5D-bis, bloqueante #2):
-- los opcionales (vajilla, lavavajillas, cafetera, dispensador de agua,
-- ambientadores, insumos de cocina/baño) hoy solo existen en el motor
-- LEGADO (lib/calculatePrice.ts + lib/pricingData.ts). No entran en
-- cotizador_extras porque esa tabla (fixed/percentage/formula) no
-- alcanza para tarifas "por persona", "por unidad" o "por cantidad de
-- baños elegidos" — hace falta una noción de cantidad que hoy no existe
-- en el modelo. Esta migración la agrega, y crea las variables/opciones
-- correspondientes siguiendo el mismo patrón que TIPO_AMBIENTE/FRECUENCIA.
--
-- ⚠️ Igual que en la Etapa 5D-bis: todos los precio_fijo que carga esta
-- migración son PLACEHOLDERS — el punto medio del rango que tenía cada
-- ítem en el motor legado (lib/pricingData.ts, margen 0.5), para arrancar
-- con un número plausible mientras se prueba el motor. NO son precios de
-- venta reales de FACILIA. No cotizar a un cliente real con estos valores
-- sin que alguien de FACILIA con visibilidad comercial los revise.
--
-- Diseño elegido para la "cantidad variable ingresada por el cliente":
-- se agrega una columna cantidad_fuente a cotizador_variables con 3
-- valores posibles:
--   'ninguna'        → la opción vale precio_fijo tal cual (cantidad = 1).
--                       Ej: LAVAVAJILLAS_TIPO, CAFETERA_TIPO,
--                       DISPENSADOR_AGUA_TIPO.
--   'input_cliente'   → el cliente ingresa una cantidad en el wizard y el
--                       motor calcula precio_fijo × cantidad. Se agregan
--                       unidad_cantidad (label, ej "personas"/"unidades")
--                       y cantidad_min/cantidad_max para el input.
--                       Ej: VAJILLA_TIPO (personas), AMBIENTADORES (unidades).
--   'cantidad_banos'  → la cantidad la calcula el motor (no el cliente):
--                       cuenta cuántos ambientes de tipo BANO eligió el
--                       cliente en TIPO_AMBIENTE (mínimo 1, igual que el
--                       legado). Ej: los 4 INSUMO_*_NIVEL.
--
-- Los add-ons de "incluir dispensador" de cada insumo y la sanitización
-- semanal de vajilla SÍ encajan en cotizador_extras (son tarifas fijas
-- simples, no dependen de cantidad) — se agregan ahí, no acá.
-- ============================================================

-- ── 1. Nuevas columnas en cotizador_variables ─────────────────────

alter table public.cotizador_variables
  add column if not exists cantidad_fuente text not null default 'ninguna';

do $$
begin
  begin
    alter table public.cotizador_variables
      add constraint cotizador_variables_cantidad_fuente_check
      check (cantidad_fuente in ('ninguna', 'input_cliente', 'cantidad_banos'));
  exception when duplicate_object then null;
  end;
end $$;

alter table public.cotizador_variables add column if not exists unidad_cantidad text;
alter table public.cotizador_variables add column if not exists cantidad_min integer;
alter table public.cotizador_variables add column if not exists cantidad_max integer;

-- Se agrega 'select_cantidad' al catálogo de tipos válidos (variable con
-- opciones + un campo de cantidad ingresado por el cliente).
alter table public.cotizador_variables drop constraint if exists cotizador_variables_tipo_check;
alter table public.cotizador_variables
  add constraint cotizador_variables_tipo_check
  check (tipo in ('select', 'select_repetible', 'select_cantidad', 'number', 'boolean', 'text', 'formula'));

-- ── 2. Variables nuevas ────────────────────────────────────────────
-- orden 100+ para que aparezcan después de las variables existentes del
-- wizard (estructura, ambientes, frecuencia) sin tener que conocer sus
-- valores de orden actuales.

insert into public.cotizador_variables
  (nombre, codigo, tipo, orden, obligatorio, afecta_precio, activo, descripcion, cantidad_fuente, unidad_cantidad, cantidad_min, cantidad_max)
values
  ('Vajilla', 'VAJILLA_TIPO', 'select_cantidad', 100, false, true, true,
   'Arrendamiento de vajilla. Precio por persona × cantidad de personas.',
   'input_cliente', 'personas', 1, 500),
  ('Lavavajillas', 'LAVAVAJILLAS_TIPO', 'select', 110, false, true, true,
   'Arrendamiento de lavavajillas, insumos incluidos en la tarifa.',
   'ninguna', null, null, null),
  ('Cafetera', 'CAFETERA_TIPO', 'select', 120, false, true, true,
   'Arrendamiento mensual de cafetera.',
   'ninguna', null, null, null),
  ('Dispensador de agua', 'DISPENSADOR_AGUA_TIPO', 'select', 130, false, true, true,
   'Tarifa plana mensual, incluye mantenimiento.',
   'ninguna', null, null, null),
  ('Ambientadores', 'AMBIENTADORES', 'select_cantidad', 140, false, true, true,
   'Arrendamiento + insumos por unidad × cantidad de unidades (1 a 12).',
   'input_cliente', 'unidades', 1, 12),
  ('Insumos de baño/cocina — Detergente', 'INSUMO_DETERGENTE_NIVEL', 'select', 150, false, true, true,
   'Precio mensual por nivel × cantidad de baños elegidos en el presupuesto.',
   'cantidad_banos', null, null, null),
  ('Insumos de baño/cocina — Toallas de papel', 'INSUMO_TOALLAS_NIVEL', 'select', 151, false, true, true,
   'Precio mensual por nivel × cantidad de baños elegidos en el presupuesto.',
   'cantidad_banos', null, null, null),
  ('Insumos de baño/cocina — Jabón líquido', 'INSUMO_JABON_NIVEL', 'select', 152, false, true, true,
   'Precio mensual por nivel × cantidad de baños elegidos en el presupuesto.',
   'cantidad_banos', null, null, null),
  ('Insumos de baño/cocina — Papel higiénico', 'INSUMO_PAPEL_NIVEL', 'select', 153, false, true, true,
   'Precio mensual por nivel × cantidad de baños elegidos en el presupuesto.',
   'cantidad_banos', null, null, null)
on conflict (codigo) do nothing;

-- ── 3. Opciones de cada variable nueva ──────────────────────────────
-- precio_fijo = placeholder (punto medio del rango legado), "a confirmar".

insert into public.cotizador_opciones (variable_id, nombre, codigo, factor, precio_fijo, orden, activo)
select v.id, o.nombre, o.codigo, 1, o.precio_fijo, o.orden, true
from public.cotizador_variables v
join (values
  -- VAJILLA_TIPO — precio_fijo = $/persona/mes
  ('VAJILLA_TIPO', 'Estándar', 'ESTANDAR', 4.5::numeric, 1),
  ('VAJILLA_TIPO', 'Premium', 'PREMIUM', 9::numeric, 2),
  ('VAJILLA_TIPO', 'Personalizada', 'PERSONALIZADA', 9::numeric, 3),
  -- LAVAVAJILLAS_TIPO — precio_fijo = arrendamiento + insumos combinados, $/mes
  ('LAVAVAJILLAS_TIPO', 'De mesas', 'DE_MESAS', 41.5::numeric, 1),
  ('LAVAVAJILLAS_TIPO', 'De piso', 'DE_PISO', 51.5::numeric, 2),
  -- CAFETERA_TIPO — precio_fijo = arrendamiento, $/mes
  ('CAFETERA_TIPO', 'Cápsulas', 'CAPSULAS', 20::numeric, 1),
  ('CAFETERA_TIPO', 'Espresso', 'ESPRESSO', 55::numeric, 2),
  ('CAFETERA_TIPO', 'Filtro', 'FILTRO', 15::numeric, 3),
  -- DISPENSADOR_AGUA_TIPO — precio_fijo = tarifa plana, $/mes
  ('DISPENSADOR_AGUA_TIPO', 'Frío / Caliente', 'FRIO_CALIENTE', 45::numeric, 1),
  ('DISPENSADOR_AGUA_TIPO', 'Con filtro', 'CON_FILTRO', 55::numeric, 2),
  ('DISPENSADOR_AGUA_TIPO', 'Ósmosis inversa', 'OSMOSIS', 82.5::numeric, 3),
  ('DISPENSADOR_AGUA_TIPO', 'Compacto', 'COMPACTO', 20::numeric, 4),
  -- AMBIENTADORES — opción única, precio_fijo = $/unidad/mes (arrendamiento + insumos)
  ('AMBIENTADORES', 'Unidad', 'UNIDAD', 14::numeric, 1),
  -- INSUMO_*_NIVEL — precio_fijo = $/baño/mes por nivel
  ('INSUMO_DETERGENTE_NIVEL', 'Estándar', 'ESTANDAR', 6.5::numeric, 1),
  ('INSUMO_DETERGENTE_NIVEL', 'Premium', 'PREMIUM', 10::numeric, 2),
  ('INSUMO_DETERGENTE_NIVEL', 'Ultra premium', 'ULTRA_PREMIUM', 15::numeric, 3),
  ('INSUMO_TOALLAS_NIVEL', 'Estándar', 'ESTANDAR', 19::numeric, 1),
  ('INSUMO_TOALLAS_NIVEL', 'Premium', 'PREMIUM', 26::numeric, 2),
  ('INSUMO_TOALLAS_NIVEL', 'Ultra premium', 'ULTRA_PREMIUM', 35::numeric, 3),
  ('INSUMO_JABON_NIVEL', 'Estándar', 'ESTANDAR', 5::numeric, 1),
  ('INSUMO_JABON_NIVEL', 'Premium', 'PREMIUM', 7.5::numeric, 2),
  ('INSUMO_JABON_NIVEL', 'Ultra premium', 'ULTRA_PREMIUM', 11.5::numeric, 3),
  ('INSUMO_PAPEL_NIVEL', 'Estándar', 'ESTANDAR', 27::numeric, 1),
  ('INSUMO_PAPEL_NIVEL', 'Premium', 'PREMIUM', 34::numeric, 2),
  ('INSUMO_PAPEL_NIVEL', 'Ultra premium', 'ULTRA_PREMIUM', 44::numeric, 3)
) as o(variable_codigo, nombre, codigo, precio_fijo, orden)
  on o.variable_codigo = v.codigo
on conflict (variable_id, codigo) do nothing;

-- ── 4. Add-ons fijos (sí encajan en cotizador_extras) ───────────────
-- No se aplican solos: el wizard/UI los ofrece solo cuando el opcional
-- del que dependen ya fue seleccionado. El motor no valida esa relación
-- (igual que ya pasa con los extras existentes) — es responsabilidad del
-- wizard no ofrecer "dispensador de detergente" si no se eligió detergente.
--
-- Se recrea el check de tipo_calculo explícitamente (no alcanza con
-- "create table if not exists" de schema.sql si la tabla ya existía de
-- antes con esa restricción definida distinto — es exactamente lo que
-- pasó al aplicar esta migración por primera vez: cotizador_extras ya
-- tenía cotizador_extras_tipo_calculo_check con otros valores permitidos
-- y el insert de 'fixed' lo violaba).
alter table public.cotizador_extras drop constraint if exists cotizador_extras_tipo_calculo_check;
alter table public.cotizador_extras
  add constraint cotizador_extras_tipo_calculo_check
  check (tipo_calculo in ('fixed', 'percentage', 'formula'));

insert into public.cotizador_extras (nombre, codigo, tipo_calculo, valor, orden, activo)
values
  ('Sanitización semanal de vajilla', 'VAJILLA_SANITIZACION', 'fixed', 7.5, 200, true),
  ('Dispensador — Detergente', 'INSUMO_DETERGENTE_DISPENSADOR', 'fixed', 4.5, 210, true),
  ('Dispensador — Toallas de papel', 'INSUMO_TOALLAS_DISPENSADOR', 'fixed', 5.5, 220, true),
  ('Dispensador — Jabón líquido', 'INSUMO_JABON_DISPENSADOR', 'fixed', 4.5, 230, true),
  ('Dispensador — Papel higiénico', 'INSUMO_PAPEL_DISPENSADOR', 'fixed', 5.5, 240, true)
on conflict (codigo) do nothing;
