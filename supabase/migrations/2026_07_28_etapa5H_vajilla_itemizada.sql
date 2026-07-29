-- ============================================================
-- Etapa 5H — Vajilla itemizada (Cubiertos / Platos / Tazas / Vasos)
-- ============================================================
-- Contexto: la Etapa 5G había modelado "Vajilla" como UNA sola variable
-- (VAJILLA_TIPO) con 3 niveles (Estándar/Premium/Personalizada) × cantidad
-- de personas. Decisión de esta sesión: se separa en una variable por
-- ítem de vajilla, mismo patrón que ya usan los INSUMO_*_NIVEL. Cada ítem
-- tiene 4 opciones en vez de 3: Estándar / Premium / Ultra Premium (una
-- progresión de precio) + Personalizada (opción aparte en paralelo, no un
-- escalón más caro — para cuando el cliente pide algo a medida).
--
-- Además, esta migración DEJA OBSOLETAS dos variables que quedan
-- reemplazadas por las 4 nuevas:
--   - 'vajilla_tipo' (minúscula) — variable vieja, anterior a la Etapa 5G,
--     con cantidad_fuente 'ninguna'. Coexistía con VAJILLA_TIPO sin que
--     nadie la hubiera desactivado — riesgo de confusión/doble cobro.
--   - 'VAJILLA_TIPO' (mayúscula) — la variable única de la Etapa 5G.
-- Ambas se desactivan (activo=false), NO se borran: pueden estar
-- referenciadas por presupuestos ya calculados. Si en algún momento hace
-- falta reactivarlas, es un UPDATE activo=true, no hay que recrearlas.
--
-- Ítems cubiertos por esta etapa: Cubiertos, Platos, Tazas, Vasos.
-- Nota explícita del cliente: puede haber más de un tipo de vaso por
-- nivel en el futuro (ej. vaso de agua vs. vaso de trago) — NO se resuelve
-- acá a propósito, se deja para una etapa futura si hace falta.
--
-- ⚠️ Igual que en 5D-bis/5G: todos los precio_fijo de esta migración son
-- PLACEHOLDERS a confirmar con FACILIA. No cotizar a un cliente real con
-- estos valores. Quedan editables desde el panel admin
-- (/panel/configuracion/cotizador) igual que el resto.
--
-- No requiere cambios en lib/cotizador/engine.ts: el manejo de
-- cantidad_fuente='input_cliente' ya es genérico por código de variable
-- (ver buscarVariableOpcional / bucle de opcionales), no hay nada
-- hardcodeado para VAJILLA_TIPO específicamente.

-- ── 1. Desactivar las dos variables de vajilla obsoletas ────────────

update public.cotizador_variables
set activo = false
where codigo in ('vajilla_tipo', 'VAJILLA_TIPO');

-- ── 2. Variables nuevas — una por ítem de vajilla ────────────────────
-- orden 101-104 para que queden agrupadas junto a donde estaba VAJILLA_TIPO
-- (orden 100 en la Etapa 5G) sin pisar el orden de otras variables.

insert into public.cotizador_variables
  (nombre, codigo, tipo, orden, obligatorio, afecta_precio, activo, descripcion, cantidad_fuente, unidad_cantidad, cantidad_min, cantidad_max)
values
  ('Vajilla — Cubiertos', 'VAJILLA_CUBIERTOS_NIVEL', 'select_cantidad', 101, false, true, true,
   'Arrendamiento de cubiertos. Precio por persona × cantidad de personas.',
   'input_cliente', 'personas', 1, 500),
  ('Vajilla — Platos', 'VAJILLA_PLATOS_NIVEL', 'select_cantidad', 102, false, true, true,
   'Arrendamiento de platos. Precio por persona × cantidad de personas.',
   'input_cliente', 'personas', 1, 500),
  ('Vajilla — Tazas', 'VAJILLA_TAZAS_NIVEL', 'select_cantidad', 103, false, true, true,
   'Arrendamiento de tazas. Precio por persona × cantidad de personas.',
   'input_cliente', 'personas', 1, 500),
  ('Vajilla — Vasos', 'VAJILLA_VASOS_NIVEL', 'select_cantidad', 104, false, true, true,
   'Arrendamiento de vasos. Precio por persona × cantidad de personas.',
   'input_cliente', 'personas', 1, 500)
on conflict (codigo) do nothing;

-- ── 3. Opciones de cada ítem — Estándar / Premium / Ultra Premium / Personalizada ──
-- precio_fijo = placeholder ($/persona/mes), a confirmar con FACILIA.
-- La progresión Estándar < Premium < Ultra Premium es ficticia, solo para
-- tener un motor que calcule algo razonable mientras se cargan los reales.
-- 'Personalizada' queda con un precio placeholder editable igual que las
-- demás (decisión explícita del cliente: no se deja sin calcular).

insert into public.cotizador_opciones (variable_id, nombre, codigo, factor, precio_fijo, orden, activo)
select v.id, o.nombre, o.codigo, 1, o.precio_fijo, o.orden, true
from public.cotizador_variables v
join (values
  ('VAJILLA_CUBIERTOS_NIVEL', 'Estándar', 'ESTANDAR', 1.5::numeric, 1),
  ('VAJILLA_CUBIERTOS_NIVEL', 'Premium', 'PREMIUM', 3::numeric, 2),
  ('VAJILLA_CUBIERTOS_NIVEL', 'Ultra Premium', 'ULTRA_PREMIUM', 4.5::numeric, 3),
  ('VAJILLA_CUBIERTOS_NIVEL', 'Personalizada', 'PERSONALIZADA', 4.5::numeric, 4),

  ('VAJILLA_PLATOS_NIVEL', 'Estándar', 'ESTANDAR', 1.5::numeric, 1),
  ('VAJILLA_PLATOS_NIVEL', 'Premium', 'PREMIUM', 3::numeric, 2),
  ('VAJILLA_PLATOS_NIVEL', 'Ultra Premium', 'ULTRA_PREMIUM', 4.5::numeric, 3),
  ('VAJILLA_PLATOS_NIVEL', 'Personalizada', 'PERSONALIZADA', 4.5::numeric, 4),

  ('VAJILLA_TAZAS_NIVEL', 'Estándar', 'ESTANDAR', 1.5::numeric, 1),
  ('VAJILLA_TAZAS_NIVEL', 'Premium', 'PREMIUM', 3::numeric, 2),
  ('VAJILLA_TAZAS_NIVEL', 'Ultra Premium', 'ULTRA_PREMIUM', 4.5::numeric, 3),
  ('VAJILLA_TAZAS_NIVEL', 'Personalizada', 'PERSONALIZADA', 4.5::numeric, 4),

  ('VAJILLA_VASOS_NIVEL', 'Estándar', 'ESTANDAR', 1.5::numeric, 1),
  ('VAJILLA_VASOS_NIVEL', 'Premium', 'PREMIUM', 3::numeric, 2),
  ('VAJILLA_VASOS_NIVEL', 'Ultra Premium', 'ULTRA_PREMIUM', 4.5::numeric, 3),
  ('VAJILLA_VASOS_NIVEL', 'Personalizada', 'PERSONALIZADA', 4.5::numeric, 4)
) as o(variable_codigo, nombre, codigo, precio_fijo, orden)
  on o.variable_codigo = v.codigo
on conflict (variable_id, codigo) do nothing;
