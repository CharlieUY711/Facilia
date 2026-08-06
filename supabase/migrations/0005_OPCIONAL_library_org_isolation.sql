-- =============================================================================
-- OPCIONAL — NO SE APLICA POR DEFECTO.
-- =============================================================================
-- Contexto: is_admin() y is_library_staff() solo validan ROL (profiles.role),
-- sin filtrar por organizacion. Es el mismo patron que ya usa "personas" en
-- FACILIA hoy, por lo que NO se modifico ese comportamiento para Library.
--
-- Este script queda preparado para el dia que se necesite restringir el
-- repositorio PRIVADO ademas por organizacion (por ejemplo, si en el futuro
-- un rol tipo "cliente" inicia sesion directamente y debe ver unicamente los
-- documentos de SU organizacion, incluso siendo "admin" de esa organizacion).
--
-- NO EJECUTAR sin antes confirmar que:
--   1) El vinculo usuario -> organizacion via personas.profile_id/organizacion_id
--      es confiable (un profile puede no tener fila en "personas").
--   2) Esto no debe romper el acceso cruzado entre organizaciones que hoy
--      usa el staff interno (admin/colaborador) para gestionar clientes.
-- =============================================================================

-- Helper: organizacion del usuario autenticado, resuelta via personas.
create or replace function public.current_user_organizacion_id()
returns uuid
language sql
stable
security definer
as $$
  select organizacion_id
  from public.personas
  where profile_id = auth.uid()
  limit 1;
$$;

-- Ejemplo de politica adicional (mas restrictiva) para library_documents:
-- Documentos PUBLICOS: igual que hoy (is_library_staff()).
-- Documentos PRIVADOS: is_admin() Y ademas coincide organizacion_id.
--
-- drop policy if exists "Ver documentos segun repositorio" on public.library_documents;
-- create policy "Ver documentos segun repositorio"
--   on public.library_documents
--   for select
--   using (
--     (repository_type = 'publica' and is_library_staff())
--     or (
--       repository_type = 'privada'
--       and is_admin()
--       and organizacion_id = public.current_user_organizacion_id()
--     )
--   );
--
-- (Replicar el mismo criterio en la politica "Escribir documentos segun
--  repositorio" y en las equivalentes de library_folders si se decide aplicar.)
