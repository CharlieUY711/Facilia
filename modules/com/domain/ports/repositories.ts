// Puertos de persistencia. application/useCases/* dependen de estas
// interfaces, nunca de Supabase directamente — infrastructure/supabase
// las implementa. Esto es lo que permite probar los casos de uso con
// fakes en memoria (ver application/__tests__).

import type {
  ComConversationEstado,
  CommunicationPreference,
  Conversation,
  DeliveryRecord,
  Message,
  PersonaRef,
} from "../entities";

export interface CreateConversationData {
  organizacion_id: string | null;
  persona_id: string;
  work_order_id: string | null;
  created_by: string | null;
}

export interface ConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  /** Busca una conversación abierta por whatsapp para esa persona (para enrutar webhooks entrantes). */
  findOpenByPersona(personaId: string): Promise<Conversation | null>;
  create(data: CreateConversationData): Promise<Conversation>;
  updateEstado(id: string, estado: ComConversationEstado): Promise<Conversation>;
  list(filters: { organizacion_id?: string; persona_id?: string; estado?: ComConversationEstado }): Promise<
    Conversation[]
  >;
}

export interface CreateMessageData {
  conversation_id: string;
  direccion: Message["direccion"];
  tipo: Message["tipo"];
  contenido: string | null;
  proveedor: string;
  external_message_id?: string | null;
  estado_entrega: Message["estado_entrega"];
  enviado_por?: string | null;
  regla_id?: string | null;
}

export interface MessageRepository {
  findById(id: string): Promise<Message | null>;
  /** Clave de idempotencia — ver índice único com_messages_external_unique. */
  findByExternalId(proveedor: string, externalMessageId: string): Promise<Message | null>;
  create(data: CreateMessageData): Promise<Message>;
  updateEstadoEntrega(
    id: string,
    estadoEntrega: Message["estado_entrega"],
    patch?: { external_message_id?: string | null }
  ): Promise<Message>;
  listByConversation(conversationId: string, limit?: number): Promise<Message[]>;
}

export interface CreateDeliveryRecordData {
  message_id: string;
  proveedor: string;
  estado: DeliveryRecord["estado"];
  error_code?: string | null;
  raw_payload?: unknown;
}

export interface DeliveryRepository {
  create(data: CreateDeliveryRecordData): Promise<DeliveryRecord>;
  /** Último registro de entrega para ese mensaje (para el chequeo de idempotencia de estados repetidos). */
  findLatestByMessage(messageId: string): Promise<DeliveryRecord | null>;
}

/**
 * Lectura de Directory desde COM. Es de solo lectura — COM no crea ni
 * modifica personas, solo necesita resolver teléfono ⇄ persona para
 * enrutar mensajes. No duplica la entidad Persona (ver COM-01 §3).
 */
export interface PersonaDirectoryPort {
  findById(id: string): Promise<PersonaRef | null>;
  /** Busca por teléfono normalizado E.164, usado para enrutar webhooks entrantes. */
  findByTelefono(telefono: string): Promise<PersonaRef | null>;
}

export interface CommunicationPreferenceRepository {
  findByPersona(personaId: string): Promise<CommunicationPreference | null>;
}
