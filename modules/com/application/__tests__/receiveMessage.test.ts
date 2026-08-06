import { test } from "node:test";
import assert from "node:assert/strict";

import { ReceiveMessageUseCase } from "../useCases/receiveMessage";
import { RegisterDeliveryStatusUseCase } from "../useCases/registerDeliveryStatus";
import {
  FakeCommunicationProvider,
  FakeConversationRepository,
  FakeDeliveryRepository,
  FakeEvidenceStorageProvider,
  FakeMessageRepository,
  FakePersonaDirectory,
} from "./fakes";

const WEBHOOK_REQUEST = { rawBody: "", headers: {}, url: "https://facilia.example/api/com/webhooks/twilio" };

function buildUseCase() {
  const provider = new FakeCommunicationProvider();
  const conversations = new FakeConversationRepository();
  const messages = new FakeMessageRepository();
  const deliveries = new FakeDeliveryRepository();
  const personas = new FakePersonaDirectory([
    { id: "persona-1", organizacion_id: "org-1", nombre: "Juan Pérez", telefono: "+59899111222" },
  ]);
  const evidence = new FakeEvidenceStorageProvider();
  const registerDeliveryStatus = new RegisterDeliveryStatusUseCase(messages, deliveries);
  const useCase = new ReceiveMessageUseCase(provider, conversations, messages, personas, evidence, registerDeliveryStatus);
  return { useCase, provider, conversations, messages, deliveries, personas, evidence };
}

test("ReceiveMessage: mensaje entrante nuevo crea conversación y Message", async () => {
  const { useCase, provider, conversations, messages } = buildUseCase();
  provider.nextWebhookEvent = {
    type: "inbound_message",
    message: { externalMessageId: "SM001", from: "+59899111222", to: "+14155238886", body: "CONFIRMAR", mediaUrls: [], raw: {} },
  };

  const result = await useCase.execute(WEBHOOK_REQUEST);

  assert.equal(result.kind, "inbound_message");
  assert.equal(conversations.rows.length, 1);
  assert.equal(messages.rows.length, 1);
  assert.equal(messages.rows[0].direccion, "entrante");
  assert.equal(messages.rows[0].contenido, "CONFIRMAR");
});

test("ReceiveMessage: el mismo external_message_id no duplica el Message (idempotencia)", async () => {
  const { useCase, provider, messages } = buildUseCase();
  provider.nextWebhookEvent = {
    type: "inbound_message",
    message: { externalMessageId: "SM002", from: "+59899111222", to: "+14155238886", body: "NO PUEDO", mediaUrls: [], raw: {} },
  };

  await useCase.execute(WEBHOOK_REQUEST);
  const second = await useCase.execute(WEBHOOK_REQUEST);

  assert.equal(second.kind, "duplicate");
  assert.equal(messages.rows.length, 1, "no debe crear un segundo Message para el mismo SID");
});

test("ReceiveMessage: teléfono desconocido se ignora sin crear conversación huérfana", async () => {
  const { useCase, provider, conversations } = buildUseCase();
  provider.nextWebhookEvent = {
    type: "inbound_message",
    message: { externalMessageId: "SM003", from: "+59890000000", to: "+14155238886", body: "hola", mediaUrls: [], raw: {} },
  };

  const result = await useCase.execute(WEBHOOK_REQUEST);

  assert.equal(result.kind, "ignored");
  assert.equal(conversations.rows.length, 0);
});

test("ReceiveMessage: mensaje con media dispara EvidenceStorageProvider por cada URL", async () => {
  const { useCase, provider, evidence } = buildUseCase();
  provider.nextWebhookEvent = {
    type: "inbound_message",
    message: {
      externalMessageId: "SM004",
      from: "+59899111222",
      to: "+14155238886",
      body: null,
      mediaUrls: ["https://api.twilio.com/media/1", "https://api.twilio.com/media/2"],
      raw: {},
    },
  };

  const result = await useCase.execute(WEBHOOK_REQUEST);

  assert.equal(result.kind, "inbound_message");
  assert.equal(evidence.calls.length, 2);
});

test("ReceiveMessage: status callback actualiza el Message saliente correspondiente", async () => {
  const { useCase, provider, messages, deliveries } = buildUseCase();

  await messages.create({
    conversation_id: "conv-1",
    direccion: "saliente",
    tipo: "texto",
    contenido: "hola",
    proveedor: "twilio",
    external_message_id: "SM100",
    estado_entrega: "enviado",
  });

  provider.nextWebhookEvent = {
    type: "delivery_status",
    status: { externalMessageId: "SM100", status: "delivered" },
  };

  const result = await useCase.execute(WEBHOOK_REQUEST);

  assert.equal(result.kind, "delivery_status");
  assert.equal(messages.rows[0].estado_entrega, "entregado");
  assert.equal(deliveries.rows.length, 1);
  assert.equal(deliveries.rows[0].estado, "delivered");
});

test("ReceiveMessage: un status callback repetido (mismo estado) no duplica el DeliveryRecord", async () => {
  const setup = buildUseCase();
  await setup.messages.create({
    conversation_id: "conv-1",
    direccion: "saliente",
    tipo: "texto",
    contenido: "hola",
    proveedor: "twilio",
    external_message_id: "SM200",
    estado_entrega: "enviado",
  });

  setup.provider.nextWebhookEvent = { type: "delivery_status", status: { externalMessageId: "SM200", status: "delivered" } };
  await setup.useCase.execute(WEBHOOK_REQUEST);

  setup.provider.nextWebhookEvent = { type: "delivery_status", status: { externalMessageId: "SM200", status: "delivered" } };
  const second = await setup.useCase.execute(WEBHOOK_REQUEST);

  assert.equal(second.kind, "delivery_status_skipped_duplicate");
  assert.equal(setup.deliveries.rows.length, 1, "no debe insertar dos DeliveryRecord iguales seguidos");
});
