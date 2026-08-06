import { test } from "node:test";
import assert from "node:assert/strict";

import { computeTwilioSignature, parseFormUrlEncoded, validateTwilioSignature } from "../twilioSignature";

const AUTH_TOKEN = "test-auth-token";
const URL = "https://facilia.example/api/com/webhooks/twilio";
const PARAMS = { MessageSid: "SM123", Body: "CONFIRMAR", From: "whatsapp:+59899111222" };

test("validateTwilioSignature acepta una firma calculada correctamente", () => {
  const signature = computeTwilioSignature(AUTH_TOKEN, URL, PARAMS);
  assert.equal(validateTwilioSignature(AUTH_TOKEN, URL, PARAMS, signature), true);
});

test("validateTwilioSignature rechaza una firma con el Auth Token equivocado", () => {
  const signature = computeTwilioSignature("otro-token", URL, PARAMS);
  assert.equal(validateTwilioSignature(AUTH_TOKEN, URL, PARAMS, signature), false);
});

test("validateTwilioSignature rechaza si la URL no coincide exactamente", () => {
  const signature = computeTwilioSignature(AUTH_TOKEN, URL, PARAMS);
  assert.equal(validateTwilioSignature(AUTH_TOKEN, `${URL}?extra=1`, PARAMS, signature), false);
});

test("validateTwilioSignature rechaza si falta el header", () => {
  assert.equal(validateTwilioSignature(AUTH_TOKEN, URL, PARAMS, undefined), false);
  assert.equal(validateTwilioSignature(AUTH_TOKEN, URL, PARAMS, null), false);
});

test("validateTwilioSignature rechaza si se manipula un parámetro después de firmar", () => {
  const signature = computeTwilioSignature(AUTH_TOKEN, URL, PARAMS);
  const tampered = { ...PARAMS, Body: "NO PUEDO" };
  assert.equal(validateTwilioSignature(AUTH_TOKEN, URL, tampered, signature), false);
});

test("parseFormUrlEncoded decodifica pares clave=valor", () => {
  const parsed = parseFormUrlEncoded("MessageSid=SM123&Body=CONFIRMAR&From=whatsapp%3A%2B59899111222");
  assert.deepEqual(parsed, { MessageSid: "SM123", Body: "CONFIRMAR", From: "whatsapp:+59899111222" });
});
