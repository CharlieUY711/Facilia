// Puerto de dominio: abstrae el proveedor de transporte (WhatsApp).
//
// Regla de arquitectura (COM-02): el dominio y los casos de uso de
// application/ SOLO conocen esta interfaz. La única implementación en
// esta etapa es TwilioWhatsAppProvider (infrastructure/twilio), pero
// nada impide agregar otra en el futuro (ej. WhatsApp Cloud API directa)
// sin tocar SendCommunication ni ReceiveMessage.

import type { ComDeliveryEstado } from "../entities";

export interface OutboundMessagePayload {
  /** Teléfono destino en formato E.164, sin el prefijo "whatsapp:". */
  to: string;
  body: string;
  /** URLs de medios a adjuntar (opcional, no usado en el MVP de salida). */
  mediaUrls?: string[];
}

export interface ProviderSendResult {
  /** Id del mensaje en el proveedor (ej. Twilio MessageSid). */
  externalMessageId: string;
  /** Estado crudo que devuelve el proveedor al aceptar el envío (ej. "queued"). */
  providerStatus: string;
}

export interface ProviderDeliveryStatus {
  externalMessageId: string;
  status: ComDeliveryEstado;
  errorCode?: string | null;
  raw?: unknown;
}

export interface InboundProviderMessage {
  externalMessageId: string;
  /** Teléfono origen en formato E.164, sin el prefijo "whatsapp:". */
  from: string;
  to: string;
  body: string | null;
  mediaUrls: string[];
  raw: unknown;
}

export type WebhookEvent =
  | { type: "inbound_message"; message: InboundProviderMessage }
  | { type: "delivery_status"; status: ProviderDeliveryStatus }
  | { type: "ignored"; reason: string };

export interface WebhookRequest {
  /** Body crudo, tal cual llega (application/x-www-form-urlencoded en Twilio). */
  rawBody: string;
  /** Headers HTTP, en minúsculas. */
  headers: Record<string, string>;
  /** URL absoluta exacta de la request, tal como la configuró Twilio. */
  url: string;
}

export interface CommunicationProvider {
  /** Nombre del proveedor, tal como se guarda en com_messages.proveedor. */
  readonly name: string;

  sendMessage(payload: OutboundMessagePayload): Promise<ProviderSendResult>;

  getDeliveryStatus(externalMessageId: string): Promise<ProviderDeliveryStatus>;

  /**
   * Valida la firma y normaliza el payload crudo del webhook en un
   * evento de dominio. Lanza InvalidWebhookSignatureError si la firma
   * no corresponde — la API route no debe interpretar nada del body
   * sin pasar antes por acá.
   */
  processWebhook(request: WebhookRequest): WebhookEvent;
}
