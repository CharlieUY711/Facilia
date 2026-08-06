// Errores de dominio del módulo COM. Los casos de uso (application/*)
// lanzan estos errores en vez de dejar pasar excepciones crudas de
// Postgres o del proveedor de WhatsApp — así las API routes pueden
// mapearlas a códigos HTTP sin conocer detalles de infraestructura.

export class ComDomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "ComDomainError";
  }
}

export class ConversationNotFoundError extends ComDomainError {
  constructor(id: string) {
    super(`No existe la conversación ${id}.`, "CONVERSATION_NOT_FOUND");
  }
}

export class ConversationClosedError extends ComDomainError {
  constructor(id: string) {
    super(`La conversación ${id} está cerrada.`, "CONVERSATION_CLOSED");
  }
}

export class PersonaNotFoundError extends ComDomainError {
  constructor(id: string) {
    super(`No existe la persona ${id}.`, "PERSONA_NOT_FOUND");
  }
}

export class RecipientPhoneMissingError extends ComDomainError {
  constructor(personaId: string) {
    super(`La persona ${personaId} no tiene teléfono WhatsApp configurado.`, "RECIPIENT_PHONE_MISSING");
  }
}

export class CommunicationDisabledError extends ComDomainError {
  constructor(personaId: string) {
    super(`La persona ${personaId} tiene las comunicaciones por WhatsApp deshabilitadas.`, "COMMUNICATION_DISABLED");
  }
}

/** Error de transporte — el proveedor (Twilio) no pudo enviar el mensaje. */
export class ProviderSendError extends ComDomainError {
  constructor(message: string, public readonly providerErrorCode?: string) {
    super(message, "PROVIDER_SEND_ERROR");
  }
}

/** La firma del webhook entrante no es válida — posible origen falso. */
export class InvalidWebhookSignatureError extends ComDomainError {
  constructor() {
    super("Firma de webhook inválida.", "INVALID_WEBHOOK_SIGNATURE");
  }
}
