import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/serverAuth";

const TIPOS_VALIDOS = ["cliente", "proveedor", "interna", "otro"] as const;

/**
 * GET /api/organizaciones
 * Lista todas las organizaciones (clientes, proveedores, interna).
 * Solo Super Admin / Administrador.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("organizaciones")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, organizaciones: data });
}

/**
 * POST /api/organizaciones
 * Body: { nombre, tipo?, rut?, email?, telefono?, direccion?, notas? }
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

  const service = createServiceClient();
  const { data, error } = await service
    .from("organizaciones")
    .insert({
      nombre,
      tipo,
      rut: body.rut || null,
      email: body.email || null,
      telefono: body.telefono || null,
      sitio_web: body.sitio_web || null,
      direccion: body.direccion || null,
      ciudad: body.ciudad || null,
      notas: body.notas || null,
      created_by: auth.uid,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, organizacion: data });
}
