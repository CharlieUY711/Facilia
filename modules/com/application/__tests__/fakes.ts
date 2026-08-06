import type {
  ComConversationEstado,
  CommunicationPreference,
  Conversation,
  DeliveryRecord,
  Message,
  PersonaRef,
} from "../../domain/entities";
import type {
  CommunicationProvider,
  OutboundMessagePayload,
  ProviderDeliveryStatus,
  ProviderSendResult,
  WebhookEvent,
  WebhookRequest,
} from "../../domain/ports/CommunicationProvider";
import type {
  EvidenceStorageProvider,
  SaveEvidenceReferenceInput,
  SaveEvidenceReferenceResult,
} from "../../domain/ports/EvidenceStorageProvider";
import type {
  CommunicationPreferenceRepository,
  ConversationRepository,
  CreateConversationData,
  CreateDeliveryRecordData,
  CreateMessageData,
  DeliveryRepository,
  MessageRepository,
  PersonaDirectoryPort,
} from "../../domain/ports/repositories";

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export class FakeConversationRepository implements ConversationRepository {
  public rows: Conversation[] = [];

  async findById(id: string) {
    return this.rows.find((c) => c.id === id) ?? null;
  }

  async findOpenByPersona(personaId: string) {
    return this.rows.find((c) => c.persona_id === personaId && c.estado === "abierta") ?? null;
  }

  async create(data: CreateConversationData): Promise<Conversation> {
    const row: Conversation = {
      id: nextId("conv"),
      organizacion_id: data.organizacion_id,
      persona_id: data.persona_id,
      work_order_id: data.work_order_id,
      channel: "whatsapp",
      estado: "abierta",
      iniciada_at: new Date().toISOString(),
      cerrada_at: null,
      created_by: data.created_by,
    };
    this.rows.push(row);
    return row;
  }

  async updateEstado(id: string, estado: ComConversationEstado): Promise<Conversation> {
    const row = this.rows.find((c) => c.id === id);
    if (!row) throw new Error("not found");
    row.estado = estado;
    return row;
  }

  async list(): Promise<Conversation[]> {
    return this.rows;
  }
}

export class FakeMessageRepository implements MessageRepository {
  public rows: Message[] = [];

  async findById(id: string) {
    return this.rows.find((m) => m.id === id) ?? null;
  }

  async findByExternalId(proveedor: string, externalMessageId: string) {
    return this.rows.find((m) => m.proveedor === proveedor && m.external_message_id === externalMessageId) ?? null;
  }

  async create(data: CreateMessageData): Promise<Message> {
    // Simula el índice único com_messages_external_unique.
    if (data.external_message_id) {
      const dup = await this.findByExternalId(data.proveedor, data.external_message_id);
      if (dup) return dup;
    }
    const row: Message = {
      id: nextId("msg"),
      conversation_id: data.conversation_id,
      direccion: data.direccion,
      tipo: data.tipo,
      contenido: data.contenido,
      proveedor: data.proveedor,
      external_message_id: data.external_message_id ?? null,
      estado_entrega: data.estado_entrega,
      enviado_por: data.enviado_por ?? null,
      regla_id: data.regla_id ?? null,
      created_at: new Date().toISOString(),
    };
    this.rows.push(row);
    return row;
  }

  async updateEstadoEntrega(
    id: string,
    estadoEntrega: Message["estado_entrega"],
    patch?: { external_message_id?: string | null }
  ): Promise<Message> {
    const row = this.rows.find((m) => m.id === id);
    if (!row) throw new Error("not found");
    row.estado_entrega = estadoEntrega;
    if (patch?.external_message_id !== undefined) row.external_message_id = patch.external_message_id;
    return row;
  }

  async listByConversation(conversationId: string): Promise<Message[]> {
    return this.rows.filter((m) => m.conversation_id === conversationId);
  }
}

export class FakeDeliveryRepository implements DeliveryRepository {
  public rows: DeliveryRecord[] = [];

  async create(data: CreateDeliveryRecordData): Promise<DeliveryRecord> {
    const row: DeliveryRecord = {
      id: nextId("delivery"),
      message_id: data.message_id,
      proveedor: data.proveedor,
      estado: data.estado,
      error_code: data.error_code ?? null,
      raw_payload: data.raw_payload ?? null,
      created_at: new Date().toISOString(),
    };
    this.rows.push(row);
    return row;
  }

  async findLatestByMessage(messageId: string): Promise<DeliveryRecord | null> {
    const rows = this.rows.filter((d) => d.message_id === messageId);
    return rows[rows.length - 1] ?? null;
  }
}

export class FakePersonaDirectory implements PersonaDirectoryPort {
  constructor(public personas: PersonaRef[] = []) {}

  async findById(id: string) {
    return this.personas.find((p) => p.id === id) ?? null;
  }

  async findByTelefono(telefono: string) {
    return this.personas.find((p) => p.telefono === telefono) ?? null;
  }
}

export class FakePreferenceRepository implements CommunicationPreferenceRepository {
  constructor(public preferences: CommunicationPreference[] = []) {}

  async findByPersona(personaId: string) {
    return this.preferences.find((p) => p.persona_id === personaId) ?? null;
  }
}

export class FakeEvidenceStorageProvider implements EvidenceStorageProvider {
  public calls: SaveEvidenceReferenceInput[] = [];

  async saveEvidenceReference(input: SaveEvidenceReferenceInput): Promise<SaveEvidenceReferenceResult> {
    this.calls.push(input);
    return { stored: false, reason: "fake" };
  }
}

/**
 * Provider fake configurable: permite simular envío exitoso, envío
 * fallido y webhooks entrantes/status-callback sin pegarle a la red.
 */
export class FakeCommunicationProvider implements CommunicationProvider {
  readonly name = "twilio";
  public sendShouldFail = false;
  public nextWebhookEvent: WebhookEvent | null = null;
  public sentPayloads: OutboundMessagePayload[] = [];

  async sendMessage(payload: OutboundMessagePayload): Promise<ProviderSendResult> {
    this.sentPayloads.push(payload);
    if (this.sendShouldFail) throw new Error("simulated provider failure");
    return { externalMessageId: nextId("SM"), providerStatus: "queued" };
  }

  async getDeliveryStatus(externalMessageId: string): Promise<ProviderDeliveryStatus> {
    return { externalMessageId, status: "sent" };
  }

  processWebhook(_request: WebhookRequest): WebhookEvent {
    if (!this.nextWebhookEvent) throw new Error("configurar nextWebhookEvent antes de llamar processWebhook");
    return this.nextWebhookEvent;
  }
}
