import { NextRequest, NextResponse } from "next/server";
import { buildLibraryContainer } from "../_container";
import { getRequestContext, createServerSupabaseClient } from "../_auth-context";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    const supabase = createServerSupabaseClient();
    const { documents } = buildLibraryContainer(supabase);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "El archivo es requerido" }, { status: 400 });
    }

    const repositoryType = String(formData.get("repositoryType") ?? "");
    const folderId = formData.get("folderId") ? String(formData.get("folderId")) : null;
    const visibility = String(formData.get("visibility") ?? (repositoryType === "PUBLIC" ? "PUBLIC" : "PRIVATE"));
    const title = formData.get("title") ? String(formData.get("title")) : undefined;
    const description = formData.get("description") ? String(formData.get("description")) : null;

    const extension = file.name.includes(".") ? file.name.split(".").pop()! : "bin";
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await documents.uploadDocument.execute({
      organizationId: ctx.organizationId,
      repositoryType,
      folderId,
      file: buffer,
      originalName: file.name,
      extension,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      title,
      description,
      visibility,
      userId: ctx.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
