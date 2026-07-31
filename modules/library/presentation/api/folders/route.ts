import { NextRequest, NextResponse } from "next/server";
import { buildLibraryContainer } from "../_container";
import { getRequestContext, createServerSupabaseClient } from "../_auth-context";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { folders } = buildLibraryContainer(supabase);

    const { searchParams } = new URL(req.url);
    const repositoryType = searchParams.get("repositoryType");
    if (!repositoryType) {
      return NextResponse.json({ error: "repositoryType es requerido" }, { status: 400 });
    }

    const result = await folders.listFolders.execute({
      organizationId: ctx.organizationId,
      repositoryType,
      parentFolderId: searchParams.has("parentFolderId") ? searchParams.get("parentFolderId") : undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { folders } = buildLibraryContainer(supabase);
    const body = await req.json();

    const result = await folders.createFolder.execute({
      organizationId: ctx.organizationId,
      repositoryType: body.repositoryType,
      parentFolderId: body.parentFolderId ?? null,
      name: body.name,
      description: body.description ?? null,
      userId: ctx.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
