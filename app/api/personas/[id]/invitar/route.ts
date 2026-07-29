import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const ROLES_VALIDOS = ["super_admin", "admin", "colaborador", "personal", "usuario"] as const;

/**
 * POST /api/personas/:id/invitar
 * Body: { role? } — si no se manda, usa persona.pending_role o "usuario".
 * Crea el usuario en Supabase Auth (le llega un mail de invitación
 * para poner su contraseña) y lo vincula a la Persona existente.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { data: persona, error: fetchError } = await service
    .from("personas")
    .select("id, nombre, email, profile_id, pending_role")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  if (!persona) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
  if (persona.profile_id) {
    return NextResponse.json({ ok: false, error: "Esta persona ya tiene acceso." }, { status: 400 });
  }
  if (!persona.email) {
    return NextResponse.json(
      { ok: false, error: "Cargale un email a esta persona antes de invitarla." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const role = body.role || persona.pending_role || "usuario";
  if (!ROLES_VALIDOS.includes(role)) {
    return NextResponse.json({ ok: false, error: "Rol inválido" }, { status: 400 });
  }
  if (role === "super_admin" && auth.role !== "super_admin") {
    return NextResponse.json(
      { ok: false, error: "Solo Super Admin puede otorgar el rol Super Admin." },
      { status: 403 }
    );
  }

  const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(
    persona.email,
    { data: { nombre: persona.nombre } }
  );
  if (inviteError || !invited?.user) {
    return NextResponse.json(
      { ok: false, error: inviteError?.message ?? "No se pudo enviar la invitación." },
      { status: 500 }
    );
  }
  const newUserId = invited.user.id;

  // El trigger on_auth_user_created ya creó un profile (rol "personal"
  // por defecto) y una Persona nueva y separada para ese profile.
  // Acá: 1) borramos esa Persona duplicada, 2) vinculamos la Persona
  // original a este profile, 3) aplicamos el rol elegido.
  await service.from("personas").delete().eq("profile_id", newUserId).neq("id", persona.id);

  const { error: linkError } = await service
    .from("personas")
    .update({ profile_id: newUserId, pending_role: null })
    .eq("id", persona.id);
  if (linkError) return NextResponse.json({ ok: false, error: linkError.message }, { status: 500 });

  const { error: roleError } = await service.from("profiles").update({ role }).eq("id", newUserId);
  if (roleError) return NextResponse.json({ ok: false, error: roleError.message }, { status: 500 });

  const { data: actualizada } = await service
    .from("personas")
    .select("*, organizaciones ( id, nombre ), locaciones ( id, nombre ), profiles!personas_profile_id_fkey ( id, role, email )")
    .eq("id", persona.id)
    .single();

  return NextResponse.json({ ok: true, persona: actualizada });
}
