import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_VALIDOS = ["cliente", "personal_facilia", "proveedor", "otro"] as const;
const ROLES_VALIDOS = ["super_admin", "admin", "colaborador", "personal", "usuario"] as const;
const CAMPOS_EDITABLES = [
  "nombre",
  "apellido",
  "email",
  "telefono",
  "direccion",
  "cargo",
  "tipo",
  "organizacion_id",
  "locacion_id",
  "notas",
] as const;

/**
 * PATCH /api/personas/:id
 * Body puede incluir campos del contacto y/o { role } para cambiar
 * el rol de acceso de una persona que YA tiene login (profile_id).
 * Nadie salvo Super Admin puede otorgar o tocar el rol "super_admin".
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const body = await req.json();

  const { data: persona, error: fetchError } = await service
    .from("personas")
    .select("id, profile_id, profiles ( role )")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  if (!persona) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });

  // Cambio de rol (solo si la persona ya tiene acceso al sistema).
  if (body.role !== undefined) {
    if (!persona.profile_id) {
      return NextResponse.json(
        { ok: false, error: "Esta persona todavía no tiene acceso. Invitala primero." },
        { status: 400 }
      );
    }
    if (!ROLES_VALIDOS.includes(body.role)) {
      return NextResponse.json({ ok: false, error: "Rol inválido" }, { status: 400 });
    }

    const rolActual = (persona.profiles as any)?.role;
    const esCambioDeSuperAdmin = body.role === "super_admin" || rolActual === "super_admin";
    if (esCambioDeSuperAdmin && auth.role !== "super_admin") {
      return NextResponse.json(
        { ok: false, error: "Solo Super Admin puede otorgar o modificar el rol Super Admin." },
        { status: 403 }
      );
    }
    if (persona.profile_id === auth.uid && rolActual === "super_admin" && body.role !== "super_admin") {
      return NextResponse.json(
        { ok: false, error: "No podés quitarte el rol de Super Admin a vos mismo." },
        { status: 400 }
      );
    }

    const { error: roleError } = await service
      .from("profiles")
      .update({ role: body.role })
      .eq("id", persona.profile_id);
    if (roleError) return NextResponse.json({ ok: false, error: roleError.message }, { status: 500 });
  }

  // Campos del contacto.
  const updates: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) {
      if (campo === "tipo" && body.tipo && !TIPOS_VALIDOS.includes(body.tipo)) {
        return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
      }
      updates[campo] = body[campo] || null;
    }
  }

  let data = null;
  if (Object.keys(updates).length > 0) {
    const { data: updated, error: updateError } = await service
      .from("personas")
      .update(updates)
      .eq("id", params.id)
      .select("*, organizaciones ( id, nombre ), locaciones ( id, nombre ), profiles ( id, role, email )")
      .single();
    if (updateError) return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    data = updated;
  } else {
    const { data: current } = await service
      .from("personas")
      .select("*, organizaciones ( id, nombre ), locaciones ( id, nombre ), profiles ( id, role, email )")
      .eq("id", params.id)
      .single();
    data = current;
  }

  return NextResponse.json({ ok: true, persona: data });
}

/**
 * DELETE /api/personas/:id
 * Borra el contacto del directorio. Si tenía acceso al sistema, el
 * login NO se toca acá — para revocar acceso usar
 * POST /api/personas/:id/revocar.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { error } = await service.from("personas").delete().eq("id", params.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
