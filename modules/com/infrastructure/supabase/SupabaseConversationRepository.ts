import { createServiceClient } from "@/lib/supabase/server";
import type { Conversation, ComConversationEstado } from "../../domain/entities";
import type { ConversationRepository, CreateConversationData } from "../../domain/ports/repositories";

const TABLE = "com_conversations";

export class SupabaseConversationRepository implements ConversationRepository {
  async findById(id: string): Promise<Conversation | null> {
    const service = createServiceClient();
    const { data, error } = await service.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[com] error al buscar conversación: ${error.message}`);
    return (data as Conversation | null) ?? null;
  }

  async findOpenByPersona(personaId: string): Promise<Conversation | null> {
    const service = createServiceClient();
    const { data, error } = await service
      .from(TABLE)
      .select("*")
      .eq("persona_id", personaId)
      .eq("channel", "whatsapp")
      .eq("estado", "abierta")
      .order("iniciada_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`[com] error al buscar conversación abierta: ${error.message}`);
    return (data as Conversation | null) ?? null;
  }

  async create(data: CreateConversationData): Promise<Conversation> {
    const service = createServiceClient();
    const { data: row, error } = await service
      .from(TABLE)
      .insert({
        organizacion_id: data.organizacion_id,
        persona_id: data.persona_id,
        work_order_id: data.work_order_id,
        created_by: data.created_by,
      })
      .select("*")
      .single();
    if (error) throw new Error(`[com] error al crear conversación: ${error.message}`);
    return row as Conversation;
  }

  async updateEstado(id: string, estado: ComConversationEstado): Promise<Conversation> {
    const service = createServiceClient();
    const patch: Record<string, unknown> = { estado };
    if (estado === "cerrada") patch.cerrada_at = new Date().toISOString();

    const { data, error } = await service.from(TABLE).update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(`[com] error al actualizar estado de conversación: ${error.message}`);
    return data as Conversation;
  }

  async list(filters: {
    organizacion_id?: string;
    persona_id?: string;
    estado?: ComConversationEstado;
  }): Promise<Conversation[]> {
    const service = createServiceClient();
    let query = service.from(TABLE).select("*").order("iniciada_at", { ascending: false });

    if (filters.organizacion_id) query = query.eq("organizacion_id", filters.organizacion_id);
    if (filters.persona_id) query = query.eq("persona_id", filters.persona_id);
    if (filters.estado) query = query.eq("estado", filters.estado);

    const { data, error } = await query;
    if (error) throw new Error(`[com] error al listar conversaciones: ${error.message}`);
    return (data ?? []) as Conversation[];
  }
}
