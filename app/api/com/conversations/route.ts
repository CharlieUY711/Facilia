import { NextRequest, NextResponse } from "next/server";
import { getComAuth } from "@/modules/com/auth";
import { buildComContainer } from "@/modules/com/container";
import { ComDomainError } from "@/modules/com/domain/errors";
import type { ComConversationEstado } from "@/modules/com/domain/entities";

/**
 * GET /api/com/conversations
 * Query params: organizacion_id?, persona_id?, estado?
 */
export async function GET(req: NextRequest) {
  const auth = await getComAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const estado = sp.get("estado") as ComConversationEstado | null;

  const { repositories } = buildComContainer();
  try {
    const conversations = await repositories.conversations.list({
      organizacion_id: sp.get("organizacion_id") || undefined,
      persona_id: sp.get("persona_id") || undefined,
      estado: estado || undefined,
    });
    return NextResponse.json({ ok: true, conversations });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

/**
 * POST /api/com/conversations
 * Body: { persona_id, organizacion_id?, work_order_id? }
 *
 * work_order_id es un campo suelto: Operations no existe todavía como
 * módulo en este repo (ver COM-01 §3), así que esta ruta permite crear
 * conversaciones a mano vía API interna para probar COM-02 a COM-05
 * sin depender de él.
 */
export async function POST(req: NextRequest) {
  const auth = await getComAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.persona_id || typeof body.persona_id !== "string") {
    return NextResponse.json({ ok: false, error: "persona_id es obligatorio." }, { status: 400 });
  }

  const { useCases } = buildComContainer();
  try {
    const conversation = await useCases.createConversation.execute({
      personaId: body.persona_id,
      organizacionId: body.organizacion_id ?? null,
      workOrderId: body.work_order_id ?? null,
      createdBy: auth.uid,
    });
    return NextResponse.json({ ok: true, conversation }, { status: 201 });
  } catch (err) {
    if (err instanceof ComDomainError) {
      return NextResponse.json({ ok: false, error: err.message, code: err.code }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
