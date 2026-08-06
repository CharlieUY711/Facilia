import {
  CommunicationDisabledError,
  ConversationClosedError,
  ConversationNotFoundError,
  PersonaNotFoundError,
  ProviderSendError,
  RecipientPhoneMissingError,
} from "../../domain/errors";
import type { CommunicationProvider } from "../../domain/ports/CommunicationProvider";
import type {
  CommunicationPreferenceRepository,
  ConversationRepository,
  DeliveryRepository,
  MessageRepository,
  PersonaDirectoryPort,
} from "../../domain/ports/repositories";
import type { SendCommunicationInput, SendCommunicationResult } from "../dto";

/**
 * SendCommunication — núcleo de salida de COM-02.
 *
 * Flujo (según COM-02 §3):
 *   1. Validar conversación (existe y está abierta).
 *   2. Resolver destinatario (teléfono efectivo + preferencias).
 *   3. Crear Message en estado "creado".
 *   4. Enviar mediante el CommunicationProvider (Twilio hoy).
 *   5. Registrar DeliveryRecord y actualizar el estado del Message,
 *      tanto si el envío tuvo éxito como si el proveedor falló — un
 *      error de Twilio nunca debe dejar el Message trabado en "creado".
 */
export class SendCommunicationUseCase {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly deliveries: DeliveryRepository,
    private readonly personas: PersonaDirectoryPort,
    private readonly preferences: CommunicationPreferenceRepository,
    private readonly provider: CommunicationProvider
  ) {}

  async execute(input: SendCommunicationInput): Promise<SendCommunicationResult> {
    const conversation = await this.conversations.findById(input.conversationId);
    if (!conversation) throw new ConversationNotFoundError(input.conversationId);
    if (conversation.estado !== "abierta") throw new ConversationClosedError(input.conversationId);

    const persona = await this.personas.findById(conversation.persona_id);
    if (!persona) throw new PersonaNotFoundError(conversation.persona_id);

    const preference = await this.preferences.findByPersona(persona.id);
    if (preference && preference.whatsapp_habilitado === false) {
      throw new CommunicationDisabledError(persona.id);
    }

    const telefono = preference?.telefono_whatsapp || persona.telefono;
    if (!telefono) throw new RecipientPhoneMissingError(persona.id);

    // 3. Crear el Message antes de intentar el envío — así queda
    // constancia incluso si el proveedor nunca responde (timeout).
    const message = await this.messages.create({
      conversation_id: conversation.id,
      direccion: "saliente",
      tipo: input.tipo ?? "texto",
      contenido: input.contenido,
      proveedor: this.provider.name,
      estado_entrega: "creado",
      enviado_por: input.enviadoPor ?? null,
      regla_id: input.reglaId ?? null,
    });

    try {
      const result = await this.provider.sendMessage({ to: telefono, body: input.contenido });

      const updated = await this.messages.updateEstadoEntrega(message.id, "enviado", {
        external_message_id: result.externalMessageId,
      });
      const delivery = await this.deliveries.create({
        message_id: message.id,
        proveedor: this.provider.name,
        estado: "sent",
        raw_payload: { providerStatus: result.providerStatus },
      });

      return { message: updated, delivery };
    } catch (err) {
      const providerErrorCode = err instanceof ProviderSendError ? err.providerErrorCode : undefined;

      const updated = await this.messages.updateEstadoEntrega(message.id, "fallido");
      const delivery = await this.deliveries.create({
        message_id: message.id,
        proveedor: this.provider.name,
        estado: "failed",
        error_code: providerErrorCode ?? "DELIVERY_ERROR",
        raw_payload: { error: err instanceof Error ? err.message : String(err) },
      });

      return { message: updated, delivery };
    }
  }
}
