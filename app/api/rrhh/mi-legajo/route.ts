import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/serverAuth";

/**
 * GET /api/rrhh/mi-legajo
 * Resuelve el id de Persona vinculado al usuario logueado, para
 * /dashboard/mi-legajo. Si la persona todavía no fue vinculada desde
 * el Directorio (invitada con profile_id), avisa en vez de romper.
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { data: persona, error } = await service
    .from("personas")
    .select("*, organizaciones ( id, nombre ), locaciones ( id, nombre )")
    .eq("profile_id", auth.uid)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!persona) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Todavía no estás vinculado como Persona en el Directorio. Pedile a un Administrador que te agregue en /dashboard/usuarios.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, persona });
}
