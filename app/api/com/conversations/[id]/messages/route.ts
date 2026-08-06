import { NextRequest, NextResponse } from "next/server";
import { getComAuth } from "@/modules/com/auth";
import { buildComContainer } from "@/modules/com/container";

/** GET /api/com/conversations/{id}/messages — historial, orden cronológico. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getComAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { repositories } = buildComContainer();
  try {
    const conversation = await repositories.conversations.findById(params.id);
    if (!conversation) return NextResponse.json({ ok: false, error: "Conversación no encontrada" }, { status: 404 });

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const messages = await repositories.messages.listByConversation(params.id, limit);
    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
