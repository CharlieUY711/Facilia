import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Adaptador de SOLO LECTURA hacia Directorio (public.personas). GEO no es
 * dueño de esta informacion (GEO-00 S3) — este adaptador existe unicamente
 * para no aceptar un `personaId` arbitrario al registrar un dispositivo o
 * iniciar tracking. Reutiliza la funcion SQL `geo_is_trackable_persona`
 * definida en la migracion 0000 (GEO-01), evitando duplicar la regla de
 * "persona trackeable" en dos lugares.
 *
 * La integracion formal con Directory (sincronizacion de referencia,
 * eventos UserCreated/UserDeactivated) se implementa en GEO-03; esto es
 * el minimo necesario para que GEO-02 no genere datos huerfanos.
 */
export interface PersonaDirectoryReader {
  isTrackablePersona(personaId: string): Promise<boolean>;
}

export class SupabasePersonaDirectoryReader implements PersonaDirectoryReader {
  constructor(private readonly client: SupabaseClient) {}

  async isTrackablePersona(personaId: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("geo_is_trackable_persona", {
      p_persona_id: personaId,
    });
    if (error) throw new Error(`Error al validar persona en Directorio: ${error.message}`);
    return Boolean(data);
  }
}
