// Validación de X-Twilio-Signature — implementación propia con
// node:crypto (sin el SDK "twilio"), tal como pide COM-02: "Twilio NO
// pertenece al dominio" y el objetivo explícito de no traer el SDK
// completo solo para firmar un webhook.
//
// Algoritmo (documentado por Twilio, "Request validation"):
//   1. Tomar la URL completa exacta a la que Twilio hizo el POST
//      (esquema + host + path + query string, tal cual está
//      configurada en la consola de Twilio).
//   2. Ordenar los parámetros del body por nombre de clave (orden de
//      bytes) y concatenar url + clave1 + valor1 + clave2 + valor2...
//   3. HMAC-SHA1 de ese string con el Auth Token, en base64.
//   4. Comparar contra el header X-Twilio-Signature (comparación en
//      tiempo constante).

import { createHmac, timingSafeEqual } from "node:crypto";

export function computeTwilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  const data = sortedKeys.reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signatureHeader: string | undefined | null
): boolean {
  if (!signatureHeader) return false;

  const expected = computeTwilioSignature(authToken, url, params);

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}

/** Parsea un body application/x-www-form-urlencoded a un objeto plano. */
export function parseFormUrlEncoded(rawBody: string): Record<string, string> {
  const params = new URLSearchParams(rawBody);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}
