import type { Conversation, DeliveryRecord, Message } from "../domain/entities";

export interface CreateConversationInput {
  personaId: string;
  organizacionId?: string | null;
  workOrderId?: string | null;
  createdBy: string | null;
}

export interface SendCommunicationInput {
  conversationId: string;
  contenido: string;
  tipo?: Message["tipo"];
  enviadoPor: string | null;
  reglaId?: string | null;
}

export interface SendCommunicationResult {
  message: Message;
  delivery: DeliveryRecord;
}

export interface ReceiveMessageInput {
  rawBody: string;
  headers: Record<string, string>;
  url: string;
}

export type ReceiveMessageResult =
  | { kind: "inbound_message"; message: Message; conversation: Conversation; duplicate: false }
  | { kind: "duplicate"; message: Message; duplicate: true }
  | { kind: "delivery_status"; delivery: DeliveryRecord; message: Message; duplicate: false }
  | { kind: "delivery_status_skipped_duplicate"; message: Message; duplicate: true }
  | { kind: "ignored"; reason: string };
