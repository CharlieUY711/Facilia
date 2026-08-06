import { NextRequest, NextResponse } from "next/server";
import { buildComContainer } from "@/modules/com/container";
import { InvalidWebhookSignatureError } from "@/modules/com/domain/errors";

/**
 * POST /api/com/webhooks/twilio
 *
 * Sin sesión de usuario — Twilio no manda cookies. La autorización es
 * la firma X-Twilio-Signature (ver TwilioWhatsAppProvider.processWebhook
 * y twilioSignature.ts), validada con el Auth Token por variable de
 * entorno, nunca hardcodeado (COM-02 §"Configuración segura").
 *
 * Atiende tanto mensajes entrantes como status callbacks de mensajes
 * salientes — Twilio puede apuntar ambos al mismo endpoint y se
 * distinguen por el payload (ver ReceiveMessage).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // La URL que Twilio firmó es la que está configurada en la consola —
  // debe coincidir byte a byte con esquema+host+path+query. Detrás de
  // un proxy (Vercel, etc.) req.url puede no reflejar el esquema/host
  // público real, así que se permite fijarlo por variable de entorno.
  const publicBaseUrl = process.env.COM_TWILIO_WEBHOOK_PUBLIC_URL;
  const url = publicBaseUrl ? new URL(req.nextUrl.pathname + req.nextUrl.search, publicBaseUrl).toString() : req.url;

  const { useCases } = buildComContainer();

  try {
    const result = await useCases.receiveMessage.execute({ rawBody, headers, url });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    // No es firma inválida — puede ser un error transitorio de
    // Postgres/Twilio. Devolvemos 500 a propósito: Twilio va a
    // reintentar, y ReceiveMessage es idempotente por external_message_id
    // (COM-02 §11), así que el reintento es seguro.
    console.error("[com] error procesando webhook de Twilio:", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
