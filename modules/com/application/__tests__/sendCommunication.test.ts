import { test } from "node:test";
import assert from "node:assert/strict";

import { SendCommunicationUseCase } from "../useCases/sendCommunication";
import {
  ConversationClosedError,
  ConversationNotFoundError,
  RecipientPhoneMissingError,
} from "../../domain/errors";
import {
  FakeCommunicationProvider,
  FakeConversationRepository,
  FakeDeliveryRepository,
  FakeMessageRepository,
  FakePersonaDirectory,
  FakePreferenceRepository,
} from "./fakes";

async function setup() {
  const conversations = new FakeConversationRepository();
  const messages = new FakeMessageRepository();
  const deliveries = new FakeDeliveryRepository();
  const personas = new FakePersonaDirectory([
    { id: "persona-1", organizacion_id: "org-1", nombre: "Juan Pérez", telefono: "+59899111222" },
  ]);
  const preferences = new FakePreferenceRepository();
  const provider = new FakeCommunicationProvider();

  const conversation = await conversations.create({
    organizacion_id: "org-1",
    persona_id: "persona-1",
    work_order_id: "wo-123",
    created_by: "admin-1",
  });

  const useCase = new SendCommunicationUseCase(conversations, messages, deliveries, personas, preferences, provider);
  return { useCase, conversation, conversations, messages, deliveries, personas, preferences, provider };
}

test("SendCommunication: envío exitoso registra Message enviado y DeliveryRecord sent", async () => {
  const { useCase, conversation, provider } = await setup();

  const result = await useCase.execute({
    conversationId: conversation.id,
    contenido: "Hola Juan. Tenés una nueva tarea asignada.",
    enviadoPor: "admin-1",
  });

  assert.equal(result.message.estado_entrega, "enviado");
  assert.ok(result.message.external_message_id);
  assert.equal(result.delivery.estado, "sent");
  assert.equal(provider.sentPayloads.length, 1);
  assert.equal(provider.sentPayloads[0].to, "+59899111222");
});

test("SendCommunication: si el proveedor falla, el mensaje queda FAILED (no lanza)", async () => {
  const { useCase, conversation, provider } = await setup();
  provider.sendShouldFail = true;

  const result = await useCase.execute({
    conversationId: conversation.id,
    contenido: "Hola Juan.",
    enviadoPor: "admin-1",
  });

  assert.equal(result.message.estado_entrega, "fallido");
  assert.equal(result.delivery.estado, "failed");
  assert.equal(result.delivery.error_code, "DELIVERY_ERROR");
});

test("SendCommunication: conversación inexistente lanza ConversationNotFoundError", async () => {
  const { useCase } = await setup();
  await assert.rejects(
    () => useCase.execute({ conversationId: "no-existe", contenido: "hola", enviadoPor: "admin-1" }),
    ConversationNotFoundError
  );
});

test("SendCommunication: conversación cerrada lanza ConversationClosedError", async () => {
  const { useCase, conversation, conversations } = await setup();
  await conversations.updateEstado(conversation.id, "cerrada");

  await assert.rejects(
    () => useCase.execute({ conversationId: conversation.id, contenido: "hola", enviadoPor: "admin-1" }),
    ConversationClosedError
  );
});

test("SendCommunication: persona sin teléfono lanza RecipientPhoneMissingError", async () => {
  const conversations = new FakeConversationRepository();
  const messages = new FakeMessageRepository();
  const deliveries = new FakeDeliveryRepository();
  const personas = new FakePersonaDirectory([
    { id: "persona-2", organizacion_id: "org-1", nombre: "Sin Teléfono", telefono: null },
  ]);
  const preferences = new FakePreferenceRepository();
  const provider = new FakeCommunicationProvider();
  const useCase = new SendCommunicationUseCase(conversations, messages, deliveries, personas, preferences, provider);

  const conversation = await conversations.create({
    organizacion_id: "org-1",
    persona_id: "persona-2",
    work_order_id: null,
    created_by: null,
  });

  await assert.rejects(
    () => useCase.execute({ conversationId: conversation.id, contenido: "hola", enviadoPor: null }),
    RecipientPhoneMissingError
  );
});
