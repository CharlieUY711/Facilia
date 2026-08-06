-- GEO-01: funciones helper reutilizadas por las policies RLS de todas las
-- tablas geo_*. Se apoyan en el esquema REAL de FACILIA (public.personas,
-- public.profiles, public.is_admin()) — no en organization_id/JWT de
-- organizacion, que no existe en este repositorio (ver GEO-00 S0, S9).

create extension if not exists "pgcrypto";

-- Devuelve el id de la Persona asociada al usuario autenticado actual,
-- o null si no tiene una fila en personas (no debería pasar: el trigger
-- handle_new_user crea una Persona para todo profile).
create or replace function public.geo_current_persona_id()
returns uuid as $$
  select id from public.personas where profile_id = auth.uid();
$$ language sql security definer stable set search_path = public;

-- Persona rastreable (GEO-00 S4): personal_facilia, con acceso (profile_id)
-- y estado_laboral activo. Se usa en la capa de aplicacion (GEO-02/03) para
-- validar antes de iniciar tracking; se expone tambien en SQL por si una
-- policy futura la necesita.
create or replace function public.geo_is_trackable_persona(p_persona_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.personas
    where id = p_persona_id
      and tipo = 'personal_facilia'
      and profile_id is not null
      and estado_laboral = 'activo'
  );
$$ language sql security definer stable set search_path = public;
