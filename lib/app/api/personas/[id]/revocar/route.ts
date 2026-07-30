import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

/**
 * POST /api/personas/:id/revocar
 * Elimina el login (Supabase Auth) de esta persona. El contacto
 * sigue existiendo en el directorio, solo pierde el acceso al
 * sistema; se le puede volver a invitar más adelante.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { data: persona, error: fetchError } = await service
    .from("personas")
    .select("id, profile_id, profiles!personas_profile_id_fkey ( role )")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  if (!persona) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
  if (!persona.profile_id) {
    return NextResponse.json({ ok: false, error: "Esta persona no tiene acceso." }, { status: 400 });
  }
  if (persona.profile_id === auth.uid) {
    return NextResponse.json(
      { ok: false, error: "No podés revocarte el acceso a vos mismo." },
      { status: 400 }
    );
  }

  const rolActual = (persona.profiles as any)?.role;
  if (rolActual === "super_admin" && auth.role !== "super_admin") {
    return NextResponse.json(
      { ok: false, error: "Solo Super Admin puede revocar a otro Super Admin." },
      { status: 403 }
    );
  }

  // Al borrar el usuario de Auth, el FK "profiles.id" (on delete cascade)
  // borra el profile, y "personas.profile_id" (on delete set null) deja
  // a la Persona sin acceso pero conservando el contacto.
  const { error: deleteError } = await service.auth.admin.deleteUser(persona.profile_id);
  if (deleteError) {
    return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
