import { NextRequest, NextResponse } from "next/server";
import { getComAuth } from "@/modules/com/auth";
import { buildComContainer } from "@/modules/com/container";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getComAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { repositories } = buildComContainer();
  try {
    const conversation = await repositories.conversations.findById(params.id);
    if (!conversation) return NextResponse.json({ ok: false, error: "No encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, conversation });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
