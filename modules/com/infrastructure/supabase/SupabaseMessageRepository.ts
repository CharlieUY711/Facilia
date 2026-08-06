import { createServiceClient } from "@/lib/supabase/server";
import type { Message } from "../../domain/entities";
import type { CreateMessageData, MessageRepository } from "../../domain/ports/repositories";

const TABLE = "com_messages";
// Código de error de Postgres para "unique_violation" — lo usamos para
// distinguir una colisión real del índice com_messages_external_unique
// de cualquier otro error al insertar (ver §11 del prompt COM-02).
const PG_UNIQUE_VIOLATION = "23505";

export class SupabaseMessageRepository implements MessageRepository {
  async findById(id: string): Promise<Message | null> {
    const service = createServiceClient();
    const { data, error } = await service.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[com] error al buscar mensaje: ${error.message}`);
    return (data as Message | null) ?? null;
  }

  async findByExternalId(proveedor: string, externalMessageId: string): Promise<Message | null> {
    const service = createServiceClient();
    const { data, error } = await service
      .from(TABLE)
      .select("*")
      .eq("proveedor", proveedor)
      .eq("external_message_id", externalMessageId)
      .maybeSingle();
    if (error) throw new Error(`[com] error al buscar mensaje por external_message_id: ${error.message}`);
    return (data as Message | null) ?? null;
  }

  async create(data: CreateMessageData): Promise<Message> {
    const service = createServiceClient();
    const { data: row, error } = await service
      .from(TABLE)
      .insert({
        conversation_id: data.conversation_id,
        direccion: data.direccion,
        tipo: data.tipo,
        contenido: data.contenido,
        proveedor: data.proveedor,
        external_message_id: data.external_message_id ?? null,
        estado_entrega: data.estado_entrega,
        enviado_por: data.enviado_por ?? null,
        regla_id: data.regla_id ?? null,
      })
      .select("*")
      .single();

    if (error) {
      // Carrera de idempotencia: dos webhooks del mismo external_message_id
      // llegaron casi en simultáneo y ambos pasaron el findByExternalId
      // antes de que el primero terminara de insertar. En vez de romper,
      // devolvemos la fila que efectivamente ganó la carrera.
      if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION && data.external_message_id) {
        const existing = await this.findByExternalId(data.proveedor, data.external_message_id);
        if (existing) return existing;
      }
      throw new Error(`[com] error al crear mensaje: ${error.message}`);
    }
    return row as Message;
  }

  async updateEstadoEntrega(
    id: string,
    estadoEntrega: Message["estado_entrega"],
    patch?: { external_message_id?: string | null }
  ): Promise<Message> {
    const service = createServiceClient();
    const { data, error } = await service
      .from(TABLE)
      .update({ estado_entrega: estadoEntrega, ...(patch ?? {}) })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(`[com] error al actualizar estado de entrega: ${error.message}`);
    return data as Message;
  }

  async listByConversation(conversationId: string, limit = 100): Promise<Message[]> {
    const service = createServiceClient();
    const { data, error } = await service
      .from(TABLE)
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(`[com] error al listar mensajes: ${error.message}`);
    return (data ?? []) as Message[];
  }
}
