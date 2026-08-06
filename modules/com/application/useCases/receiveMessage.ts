import type { CommunicationProvider } from "../../domain/ports/CommunicationProvider";
import type { EvidenceStorageProvider } from "../../domain/ports/EvidenceStorageProvider";
import type {
  ConversationRepository,
  MessageRepository,
  PersonaDirectoryPort,
} from "../../domain/ports/repositories";
import { RegisterDeliveryStatusUseCase } from "./registerDeliveryStatus";
import type { ReceiveMessageInput, ReceiveMessageResult } from "../dto";
import { InvalidWebhookSignatureError } from "../../domain/errors";

/**
 * ReceiveMessage — núcleo de entrada de COM-02.
 *
 * Un mismo webhook de Twilio puede traer dos cosas muy distintas y NO
 * hay forma de saber cuál es sin mirar el payload ya parseado:
 *   - un mensaje entrante (el empleado respondió "CONFIRMAR", mandó
 *     una foto, etc.) → MessageReceived;
 *   - un status callback de un mensaje que YA enviamos nosotros
 *     (delivered/read/failed) → delegado en RegisterDeliveryStatus.
 *
 * processWebhook() del provider ya devuelve el evento distinguido y
 * con la firma validada — este caso de uso no vuelve a tocar HMAC ni
 * parsing de form-urlencoded, eso es 100% responsabilidad de Twilio
 * Adapter (regla de arquitectura: el dominio no conoce Twilio).
 *
 * Idempotencia (COM-02 §11): antes de crear cualquier Message nuevo,
 * se busca por (proveedor, external_message_id) — ver el índice único
 * com_messages_external_unique. Si ya existe, se devuelve el existente
 * sin duplicar nada; así un mismo webhook reintentado por Twilio (algo
 * que Twilio hace activamente si no respondemos 200 a tiempo) no genera
 * dos filas ni dos conversaciones.
 */
export class ReceiveMessageUseCase {
  constructor(
    private readonly provider: CommunicationProvider,
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly personas: PersonaDirectoryPort,
    private readonly evidence: EvidenceStorageProvider,
    private readonly registerDeliveryStatus: RegisterDeliveryStatusUseCase
  ) {}

  async execute(input: ReceiveMessageInput): Promise<ReceiveMessageResult> {
    let event;
    try {
      event = this.provider.processWebhook({ rawBody: input.rawBody, headers: input.headers, url: input.url });
    } catch (err) {
      if (err instanceof InvalidWebhookSignatureError) throw err;
      throw err;
    }

    if (event.type === "ignored") {
      return { kind: "ignored", reason: event.reason };
    }

    if (event.type === "delivery_status") {
      const result = await this.registerDeliveryStatus.execute(event.status, this.provider.name);
      if (result.applied === false && result.reason === "MESSAGE_NOT_FOUND") {
        return { kind: "ignored", reason: "MESSAGE_NOT_FOUND" };
      }
      if (result.applied === false) {
        return { kind: "delivery_status_skipped_duplicate", message: result.message, duplicate: true };
      }
      return { kind: "delivery_status", delivery: result.delivery, message: result.message, duplicate: false };
    }

    // event.type === "inbound_message"
    const inbound = event.message;

    const existing = await this.messages.findByExternalId(this.provider.name, inbound.externalMessageId);
    if (existing) {
      return { kind: "duplicate", message: existing, duplicate: true };
    }

    const persona = await this.personas.findByTelefono(inbound.from);

    // Sin persona conocida en Directory no hay a quién atar la
    // conversación. Se descarta explícitamente en vez de crear una
    // conversación "huérfana" — queda como candidato de mejora para
    // COM-05 (alta automática de contacto desconocido).
    if (!persona) {
      return { kind: "ignored", reason: "UNKNOWN_SENDER_PHONE" };
    }

    let conversation = await this.conversations.findOpenByPersona(persona.id);
    if (!conversation) {
      conversation = await this.conversations.create({
        persona_id: persona.id,
        organizacion_id: persona.organizacion_id,
        work_order_id: null,
        created_by: null,
      });
    }

    const hasMedia = inbound.mediaUrls.length > 0;
    const message = await this.messages.create({
      conversation_id: conversation.id,
      direccion: "entrante",
      tipo: hasMedia ? "imagen" : "texto",
      contenido: inbound.body,
      proveedor: this.provider.name,
      external_message_id: inbound.externalMessageId,
      estado_entrega: "entregado",
    });

    // No se descarga ni persiste el archivo todavía (COM-02 §6: "NO
    // guardar archivo"). Se deja la referencia al puerto para que
    // COM-04 la resuelva contra Library.
    for (const mediaUrl of inbound.mediaUrls) {
      await this.evidence.saveEvidenceReference({
        messageId: message.id,
        conversationId: conversation.id,
        workOrderId: conversation.work_order_id,
        providerMediaUrl: mediaUrl,
      });
    }

    return { kind: "inbound_message", message, conversation, duplicate: false };
  }
}
