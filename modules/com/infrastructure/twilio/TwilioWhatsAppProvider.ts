// Adaptador de infraestructura: es el ÚNICO archivo del módulo que
// conoce la API REST de Twilio. Implementa el puerto de dominio
// CommunicationProvider (ver domain/ports/CommunicationProvider.ts).
//
// Deliberadamente no se instala el paquete npm "twilio": el envío es
// un POST form-urlencoded con Basic Auth y la validación de firma es
// HMAC-SHA1 puro (ver ./twilioSignature.ts) — no hay superficie que
// justifique la dependencia, y así el dominio realmente no puede
// terminar importando tipos de un SDK externo por accidente.

import { InvalidWebhookSignatureError, ProviderSendError } from "../../domain/errors";
import type {
  CommunicationProvider,
  InboundProviderMessage,
  OutboundMessagePayload,
  ProviderDeliveryStatus,
  ProviderSendResult,
  WebhookEvent,
  WebhookRequest,
} from "../../domain/ports/CommunicationProvider";
import type { ComDeliveryEstado } from "../../domain/entities";
import { parseFormUrlEncoded, validateTwilioSignature } from "./twilioSignature";

export interface TwilioWhatsAppProviderConfig {
  accountSid: string;
  authToken: string;
  /** Número habilitado en Twilio, SIN el prefijo "whatsapp:" (ej. "+14155238886"). */
  fromWhatsApp: string;
  /** Solo para pruebas — permite inyectar un fetch fake. Por defecto usa el global. */
  fetchImpl?: typeof fetch;
  apiBaseUrl?: string;
}

const TWILIO_STATUS_TO_DELIVERY_ESTADO: Record<string, ComDeliveryEstado | undefined> = {
  queued: undefined, // todavía no es un evento de entrega, es el ack inicial del POST
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
  undelivered: "undelivered",
};

function toWhatsAppAddress(phoneE164: string): string {
  return phoneE164.startsWith("whatsapp:") ? phoneE164 : `whatsapp:${phoneE164}`;
}

function fromWhatsAppAddress(waAddress: string): string {
  return waAddress.startsWith("whatsapp:") ? waAddress.slice("whatsapp:".length) : waAddress;
}

export class TwilioWhatsAppProvider implements CommunicationProvider {
  readonly name = "twilio";

  private readonly fetchImpl: typeof fetch;
  private readonly apiBaseUrl: string;

  constructor(private readonly config: TwilioWhatsAppProviderConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.apiBaseUrl = config.apiBaseUrl ?? "https://api.twilio.com/2010-04-01";
  }

  private authHeader(): string {
    const credentials = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`, "utf8").toString(
      "base64"
    );
    return `Basic ${credentials}`;
  }

  async sendMessage(payload: OutboundMessagePayload): Promise<ProviderSendResult> {
    const body = new URLSearchParams();
    body.set("To", toWhatsAppAddress(payload.to));
    body.set("From", toWhatsAppAddress(this.config.fromWhatsApp));
    body.set("Body", payload.body);
    for (const mediaUrl of payload.mediaUrls ?? []) {
      body.append("MediaUrl", mediaUrl);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.apiBaseUrl}/Accounts/${this.config.accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: this.authHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
    } catch (err) {
      throw new ProviderSendError(
        `No se pudo contactar a Twilio: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const json = await response.json().catch(() => null);

    if (!response.ok || !json) {
      const code = json?.code ? String(json.code) : String(response.status);
      const message = json?.message ?? `Twilio respondió ${response.status}`;
      throw new ProviderSendError(message, code);
    }

    if (!json.sid) {
      throw new ProviderSendError("Respuesta de Twilio sin MessageSid.");
    }

    return { externalMessageId: json.sid as string, providerStatus: (json.status as string) ?? "queued" };
  }

  async getDeliveryStatus(externalMessageId: string): Promise<ProviderDeliveryStatus> {
    let response: Response;
    try {
      response = await this.fetchImpl(
        `${this.apiBaseUrl}/Accounts/${this.config.accountSid}/Messages/${externalMessageId}.json`,
        { headers: { Authorization: this.authHeader() } }
      );
    } catch (err) {
      throw new ProviderSendError(
        `No se pudo consultar el estado en Twilio: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const json = await response.json().catch(() => null);
    if (!response.ok || !json) {
      throw new ProviderSendError(`Twilio respondió ${response.status} al consultar el estado.`);
    }

    const mapped = TWILIO_STATUS_TO_DELIVERY_ESTADO[json.status as string];
    return {
      externalMessageId,
      status: mapped ?? "sent",
      errorCode: json.error_code ? String(json.error_code) : null,
      raw: json,
    };
  }

  processWebhook(request: WebhookRequest): WebhookEvent {
    const params = parseFormUrlEncoded(request.rawBody);

    const signatureHeader = request.headers["x-twilio-signature"];
    const isValid = validateTwilioSignature(this.config.authToken, request.url, params, signatureHeader);
    if (!isValid) throw new InvalidWebhookSignatureError();

    // Twilio manda dos "formas" de webhook al mismo endpoint según cómo
    // esté configurado el número: el status callback siempre trae
    // MessageStatus; el webhook de mensaje entrante nunca lo trae.
    if (params.MessageStatus) {
      const mapped = TWILIO_STATUS_TO_DELIVERY_ESTADO[params.MessageStatus];
      if (!mapped) {
        // "queued"/"accepted", etc. — no son estados que modelemos en
        // com_delivery_records (ver check constraint de §9).
        return { type: "ignored", reason: `MessageStatus no mapeado: ${params.MessageStatus}` };
      }
      return {
        type: "delivery_status",
        status: {
          externalMessageId: params.MessageSid ?? params.SmsSid ?? "",
          status: mapped,
          errorCode: params.ErrorCode || null,
          raw: params,
        },
      };
    }

    if (params.Body !== undefined || Number(params.NumMedia ?? "0") > 0) {
      const numMedia = Number(params.NumMedia ?? "0");
      const mediaUrls: string[] = [];
      for (let i = 0; i < numMedia; i += 1) {
        const url = params[`MediaUrl${i}`];
        if (url) mediaUrls.push(url);
      }

      const inbound: InboundProviderMessage = {
        externalMessageId: params.MessageSid ?? params.SmsSid ?? "",
        from: fromWhatsAppAddress(params.From ?? ""),
        to: fromWhatsAppAddress(params.To ?? ""),
        body: params.Body ?? null,
        mediaUrls,
        raw: params,
      };

      if (!inbound.externalMessageId) {
        return { type: "ignored", reason: "Webhook sin MessageSid" };
      }

      return { type: "inbound_message", message: inbound };
    }

    return { type: "ignored", reason: "Payload de Twilio no reconocido" };
  }
}
