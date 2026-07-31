import { NextRequest, NextResponse } from "next/server";
import { buildLibraryContainer } from "../../_container";
import { getRequestContext, createServerSupabaseClient } from "../../_auth-context";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { documents } = buildLibraryContainer(supabase);

    const result = await documents.downloadDocument.execute({
      documentId: params.id,
      organizationId: ctx.organizationId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
