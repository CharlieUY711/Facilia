import { createServiceClient } from "@/lib/supabase/server";
import type { CommunicationPreference } from "../../domain/entities";
import type { CommunicationPreferenceRepository } from "../../domain/ports/repositories";

const TABLE = "com_communication_preferences";

export class SupabaseCommunicationPreferenceRepository implements CommunicationPreferenceRepository {
  async findByPersona(personaId: string): Promise<CommunicationPreference | null> {
    const service = createServiceClient();
    const { data, error } = await service.from(TABLE).select("*").eq("persona_id", personaId).maybeSingle();
    if (error) throw new Error(`[com] error al buscar preferencias de comunicación: ${error.message}`);
    return (data as CommunicationPreference | null) ?? null;
  }
}
