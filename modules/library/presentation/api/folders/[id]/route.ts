import { NextRequest, NextResponse } from "next/server";
import { buildLibraryContainer } from "../../_container";
import { getRequestContext, createServerSupabaseClient } from "../../_auth-context";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { folders } = buildLibraryContainer(supabase);
    const body = await req.json();

    const result = await folders.renameFolder.execute({
      folderId: params.id,
      organizationId: ctx.organizationId,
      newName: body.name,
      userId: ctx.userId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { folders } = buildLibraryContainer(supabase);

    await folders.deleteFolder.execute({
      folderId: params.id,
      organizationId: ctx.organizationId,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
