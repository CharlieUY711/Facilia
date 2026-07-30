import { NextRequest, NextResponse } from "next/server";
import { getLibraryAuth } from "@/lib/library/auth";
import { uploadDocumentFromFormData } from "@/lib/library/upload";

/**
 * POST /api/library/upload
 * FormData: file, repository_type, folder_id?, organizacion_id?,
 * title?, description?.
 *
 * Un archivo por request a propósito: la UI (LIB-02) sube múltiples
 * archivos en paralelo/secuencia, uno por request, para poder
 * mostrar una barra de progreso independiente por archivo y permitir
 * cancelar uno sin afectar a los demás.
 */
export async function POST(req: NextRequest) {
  const auth = await getLibraryAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Body inválido, se espera multipart/form-data" }, { status: 400 });

  const result = await uploadDocumentFromFormData(form, auth);
  if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, document: result.data }, { status: result.status });
}
