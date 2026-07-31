import { NextRequest, NextResponse } from "next/server";
import { buildLibraryContainer } from "../../_container";
import { getRequestContext, createServerSupabaseClient } from "../../_auth-context";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { documents } = buildLibraryContainer(supabase);

    const result = await documents.getDocument.execute({
      documentId: params.id,
      organizationId: ctx.organizationId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { documents } = buildLibraryContainer(supabase);

    await documents.deleteDocument.execute({
      documentId: params.id,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
