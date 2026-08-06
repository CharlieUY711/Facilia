import type { DeliveryRecord, Message } from "../../domain/entities";
import type { ProviderDeliveryStatus } from "../../domain/ports/CommunicationProvider";
import type { DeliveryRepository, MessageRepository } from "../../domain/ports/repositories";

const STATUS_TO_ESTADO_ENTREGA: Record<ProviderDeliveryStatus["status"], Message["estado_entrega"]> = {
  sent: "enviado",
  delivered: "entregado",
  read: "leido",
  failed: "fallido",
  undelivered: "fallido",
};

export type RegisterDeliveryStatusResult =
  | { applied: true; message: Message; delivery: DeliveryRecord }
  | { applied: false; reason: "MESSAGE_NOT_FOUND" }
  | { applied: false; reason: "DUPLICATE_STATUS"; message: Message };

/**
 * Aplica un cambio de estado de entrega (SENT/DELIVERED/READ/FAILED,
 * COM-02 §"RegisterDeliveryStatus") sobre el Message correspondiente.
 *
 * Idempotencia (COM-02 §10/§11): Twilio puede reenviar el mismo status
 * callback más de una vez (ej. reintentos de red de su lado). No hay
 * un unique index para delivery_records porque un mensaje sí puede
 * pasar legítimamente por el mismo estado dos veces en teoría — pero
 * si el ÚLTIMO registro ya tiene exactamente ese estado, no insertamos
 * una fila idéntica ni volvemos a tocar com_messages.
 */
export class RegisterDeliveryStatusUseCase {
  constructor(private readonly messages: MessageRepository, private readonly deliveries: DeliveryRepository) {}

  async execute(
    status: ProviderDeliveryStatus,
    proveedor: string
  ): Promise<RegisterDeliveryStatusResult> {
    const message = await this.messages.findByExternalId(proveedor, status.externalMessageId);
    if (!message) return { applied: false, reason: "MESSAGE_NOT_FOUND" };

    const latest = await this.deliveries.findLatestByMessage(message.id);
    if (latest && latest.estado === status.status) {
      return { applied: false, reason: "DUPLICATE_STATUS", message };
    }

    const delivery = await this.deliveries.create({
      message_id: message.id,
      proveedor,
      estado: status.status,
      error_code: status.errorCode ?? null,
      raw_payload: status.raw ?? null,
    });

    const updatedMessage = await this.messages.updateEstadoEntrega(
      message.id,
      STATUS_TO_ESTADO_ENTREGA[status.status]
    );

    return { applied: true, message: updatedMessage, delivery };
  }
}
