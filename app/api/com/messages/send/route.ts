import { NextRequest, NextResponse } from "next/server";
import { getComAuth } from "@/modules/com/auth";
import { buildComContainer } from "@/modules/com/container";
import { ComDomainError } from "@/modules/com/domain/errors";

/**
 * POST /api/com/messages/send
 * Body: { conversation_id, message, regla_id? }
 *
 * Nota de diseño: si Twilio rechaza el envío, esta ruta NO devuelve un
 * error HTTP — devuelve 200 con delivery.estado = "failed". El intento
 * quedó igual registrado (Message + DeliveryRecord), que es justamente
 * lo que pide COM-02 §10 ("Twilio no disponible → estado FAILED").
 * Un error HTTP real (4xx/5xx) acá significa que ni se pudo intentar
 * el envío (conversación inexistente, destinatario sin teléfono, etc).
 */
export async function POST(req: NextRequest) {
  const auth = await getComAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.conversation_id || typeof body.conversation_id !== "string") {
    return NextResponse.json({ ok: false, error: "conversation_id es obligatorio." }, { status: 400 });
  }
  if (!body?.message || typeof body.message !== "string") {
    return NextResponse.json({ ok: false, error: "message es obligatorio." }, { status: 400 });
  }

  const { useCases } = buildComContainer();
  try {
    const result = await useCases.sendCommunication.execute({
      conversationId: body.conversation_id,
      contenido: body.message,
      enviadoPor: auth.uid,
      reglaId: body.regla_id ?? null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ComDomainError) {
      const status = err.code === "CONVERSATION_NOT_FOUND" || err.code === "PERSONA_NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ ok: false, error: err.message, code: err.code }, { status });
    }
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
