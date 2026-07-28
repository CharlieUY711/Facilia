import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_VALIDOS = ["cliente", "personal_facilia", "proveedor", "otro"] as const;
const ROLES_VALIDOS = ["super_admin", "admin", "colaborador", "personal", "usuario"] as const;
type RoleValida = (typeof ROLES_VALIDOS)[number];

/**
 * GET /api/personas
 * Directorio completo: clientes, personal FACILIA y proveedores,
 * tengan o no acceso al sistema. Incluye organización, locación y
 * — si ya tiene login — su rol actual.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("personas")
    .select(
      "*, organizaciones ( id, nombre ), locaciones ( id, nombre ), profiles ( id, role, email )"
    )
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, personas: data });
}

/**
 * POST /api/personas
 * Body: { nombre, email?, telefono?, cargo?, tipo?, organizacion_id?,
 *         locacion_id?, notas?, pending_role? }
 * Crea un contacto en el directorio SIN darle acceso todavía.
 * "pending_role" es el rol que se le asignará cuando se lo invite
 * (ver /api/personas/:id/invitar). Solo Super Admin puede dejar
 * pendiente el rol "super_admin".
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const nombre = (body.nombre ?? "").trim();
  if (!nombre) {
    return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
  }

  const tipo = TIPOS_VALIDOS.includes(body.tipo) ? body.tipo : "cliente";

  let pendingRole: RoleValida | null = null;
  if (body.pending_role) {
    if (!ROLES_VALIDOS.includes(body.pending_role)) {
      return NextResponse.json({ ok: false, error: "Rol inválido" }, { status: 400 });
    }
    if (body.pending_role === "super_admin" && auth.role !== "super_admin") {
      return NextResponse.json(
        { ok: false, error: "Solo Super Admin puede asignar el rol Super Admin." },
        { status: 403 }
      );
    }
    pendingRole = body.pending_role;
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("personas")
    .insert({
      nombre,
      apellido: body.apellido || null,
      email: body.email || null,
      telefono: body.telefono || null,
      direccion: body.direccion || null,
      cargo: body.cargo || null,
      tipo,
      organizacion_id: body.organizacion_id || null,
      locacion_id: body.locacion_id || null,
      notas: body.notas || null,
      pending_role: pendingRole,
      created_by: auth.uid,
    })
    .select("*, organizaciones ( id, nombre ), locaciones ( id, nombre ), profiles ( id, role, email )")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, persona: data });
}
