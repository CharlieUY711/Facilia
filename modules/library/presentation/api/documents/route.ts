import { NextRequest, NextResponse } from "next/server";
import { buildLibraryContainer } from "../_container";
import { getRequestContext, createServerSupabaseClient } from "../_auth-context";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { documents } = buildLibraryContainer(supabase);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const input = {
      organizationId: ctx.organizationId,
      repositoryType: searchParams.get("repositoryType") ?? undefined,
      folderId: searchParams.has("folderId") ? searchParams.get("folderId") : undefined,
      extension: searchParams.get("extension") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
    };

    const result = search
      ? await documents.searchDocuments.execute({ ...input, query: search })
      : await documents.listDocuments.execute(input);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { documents } = buildLibraryContainer(supabase);
    const body = await req.json();

    if (!body.documentId) {
      return NextResponse.json({ error: "documentId es requerido" }, { status: 400 });
    }

    const result = await documents.moveDocument.execute({
      documentId: body.documentId,
      organizationId: ctx.organizationId,
      newFolderId: body.newFolderId ?? null,
      userId: ctx.userId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
