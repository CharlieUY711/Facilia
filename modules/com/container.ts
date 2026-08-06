// Composition root del módulo COM. Las API routes (app/api/com/**)
// importan SOLO de acá — nunca instancian un repositorio de
// infrastructure/ directamente. Esto es lo que le permite a
// application/useCases/* no saber nada de Supabase ni de Twilio.

import { CreateConversationUseCase } from "./application/useCases/createConversation";
import { ReceiveMessageUseCase } from "./application/useCases/receiveMessage";
import { RegisterDeliveryStatusUseCase } from "./application/useCases/registerDeliveryStatus";
import { SendCommunicationUseCase } from "./application/useCases/sendCommunication";
import { NoopEvidenceStorageProvider } from "./infrastructure/supabase/NoopEvidenceStorageProvider";
import { SupabaseCommunicationPreferenceRepository } from "./infrastructure/supabase/SupabaseCommunicationPreferenceRepository";
import { SupabaseConversationRepository } from "./infrastructure/supabase/SupabaseConversationRepository";
import { SupabaseDeliveryRepository } from "./infrastructure/supabase/SupabaseDeliveryRepository";
import { SupabaseMessageRepository } from "./infrastructure/supabase/SupabaseMessageRepository";
import { SupabasePersonaDirectoryRepository } from "./infrastructure/supabase/SupabasePersonaDirectoryRepository";
import { TwilioWhatsAppProvider } from "./infrastructure/twilio/TwilioWhatsAppProvider";

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[com] falta la variable de entorno ${name}.`);
  return value;
}

/**
 * Se recrea en cada request (no es un singleton de módulo) a propósito:
 * evita compartir estado entre requests en el entorno serverless de
 * Next.js y hace que los tests puedan levantar su propio container sin
 * pelearse con un caché global.
 */
export function buildComContainer() {
  const conversations = new SupabaseConversationRepository();
  const messages = new SupabaseMessageRepository();
  const deliveries = new SupabaseDeliveryRepository();
  const personas = new SupabasePersonaDirectoryRepository();
  const preferences = new SupabaseCommunicationPreferenceRepository();
  const evidence = new NoopEvidenceStorageProvider();

  const provider = new TwilioWhatsAppProvider({
    accountSid: readEnv("TWILIO_ACCOUNT_SID"),
    authToken: readEnv("TWILIO_AUTH_TOKEN"),
    fromWhatsApp: readEnv("TWILIO_WHATSAPP_FROM"),
  });

  const registerDeliveryStatus = new RegisterDeliveryStatusUseCase(messages, deliveries);

  return {
    repositories: { conversations, messages, deliveries, personas, preferences },
    provider,
    evidence,
    useCases: {
      createConversation: new CreateConversationUseCase(conversations, personas),
      sendCommunication: new SendCommunicationUseCase(
        conversations,
        messages,
        deliveries,
        personas,
        preferences,
        provider
      ),
      registerDeliveryStatus,
      receiveMessage: new ReceiveMessageUseCase(provider, conversations, messages, personas, evidence, registerDeliveryStatus),
    },
  };
}

export type ComContainer = ReturnType<typeof buildComContainer>;
