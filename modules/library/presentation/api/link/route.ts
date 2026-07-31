import { NextRequest, NextResponse } from "next/server";
import { buildLibraryContainer } from "../_container";
import { getRequestContext, createServerSupabaseClient } from "../_auth-context";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { documents } = buildLibraryContainer(supabase);
    const body = await req.json();

    await documents.linkDocument.execute({
      documentId: body.documentId,
      organizationId: ctx.organizationId,
      entityType: body.entityType,
      entityId: body.entityId,
      userId: ctx.userId,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { documents } = buildLibraryContainer(supabase);
    const body = await req.json();

    await documents.unlinkDocument.execute({
      documentId: body.documentId,
      entityType: body.entityType,
      entityId: body.entityId,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
