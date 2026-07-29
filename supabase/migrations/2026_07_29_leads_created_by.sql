-- Atribución de leads creados desde el panel interno (Nueva cotización).
-- Cuando el presupuesto se genera desde el sitio público (visitante anónimo)
-- created_by queda en null; cuando lo genera un usuario logueado del
-- dashboard, queda registrado quién lo hizo.

alter table public.leads
  add column if not exists created_by uuid references auth.users(id);

comment on column public.leads.created_by is
  'Usuario del dashboard que generó el presupuesto (null si vino del sitio público).';
