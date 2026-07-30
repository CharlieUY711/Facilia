-- ============================================================
-- Etapa: audit trail + modo de margen en cotizador_config
-- ============================================================
-- Dos cosas:
--
-- 1. Audit trail por parámetro: quién y cuándo tocó por última vez
--    HORA_OPERARIO / MARGEN_COMERCIAL. Se muestra en el mismo renglón
--    en la tab Parámetros ("Última actualización: fecha. Usuario: X").
--
-- 2. MODO_MARGEN: nuevo parámetro (mismo patrón que los demás, fila en
--    cotizador_config con valor numérico) que decide cómo se aplica
--    MARGEN_COMERCIAL sobre el costo:
--      0 = Markup   → precio = costo × (1 + margen / 100)   (como hasta ahora)
--      1 = GP       → precio = costo / (1 - margen / 100)   (margen sobre precio de venta)
--    Ver lib/cotizador/engine.ts.
-- ============================================================

alter table public.cotizador_config add column if not exists updated_at timestamptz;
alter table public.cotizador_config add column if not exists updated_by uuid references public.profiles (id);

insert into public.cotizador_config (clave, valor, descripcion) values
  ('MODO_MARGEN', 0, 'Cómo se aplica MARGEN_COMERCIAL: 0 = Markup (sobre costo), 1 = GP / Gross Profit (sobre precio de venta).')
on conflict (clave) do nothing;
