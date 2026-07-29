import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { calculatePrice } from "@/lib/calculatePrice";
import { generatePresupuestoPdf } from "@/lib/pdf";
import { Resend } from "resend";

const TIPO_AMBIENTE = z.enum([
  "oficina",
  "bano",
  "cocina",
  "sala_reuniones",
  "auditorio",
  "espacios_comunes",
  "barbacoa",
]);

const leadSchema = z.object({
  // Únicos datos de contacto obligatorios: teléfono y email.
  nombre: z.string().optional(),
  email: z.string().email(),
  telefono: z.string().min(6, "Ingresá un celular válido"),
  empresa: z.string().optional(),
  ambientes: z
    .array(
      z.object({
        tipo_ambiente: TIPO_AMBIENTE,
        m2: z.number().positive(),
        usuarios: z.number().nonnegative().optional(),
        luz_natural: z.boolean().optional(),
        ventana: z.boolean().optional(),
      })
    )
    .min(1, "Agregá al menos un ambiente"),
  frecuencia: z.enum(["1x_semana", "2x_semana", "3x_semana", "5x_semana", "diario"]),
  estructura: z.record(z.any()).optional(),
  opcionales: z.record(z.any()).optional(),
});

/**
 * POST /api/leads
 * Flujo completo del cotizador:
 * 1. Calcula el presupuesto (soporta varios ambientes por espacio)
 * 2. Guarda el lead en Supabase (con Service Role, sin necesidad de auth del visitante)
 */
export async function POST(req: NextRequest) {
  try {
    const body = leadSchema.parse(await req.json());
    const cotizacion = calculatePrice(body as any);

    // Si quien envía el formulario tiene una sesión activa (ej. un
    // usuario del dashboard generando "Nueva cotización"), dejamos
    // registrado quién lo creó. Los visitantes anónimos del sitio
    // público no tienen sesión, así que created_by queda en null.
    const sessionClient = createClient();
    const {
      data: { session },
    } = await sessionClient.auth.getSession();

    const supabase = createServiceClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        nombre: body.nombre || null,
        email: body.email,
        telefono: body.telefono,
        empresa: body.empresa,
        ambientes: body.ambientes,
        estructura: body.estructura ?? {},
        frecuencia: body.frecuencia,
        opcionales: body.opcionales ?? {},
        precio_visita: cotizacion.total_por_visita,
        precio_mensual: cotizacion.total_mensual,
        detalle: cotizacion,
        created_by: session?.user?.id ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const panelUrl = `${siteUrl}/lead/${lead.id}`;
    const logoPath = path.join(process.cwd(), "public", "FACILIA_By.png");
    const logoUrl = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;

    const pdfBuffer = await generatePresupuestoPdf({
      numeroPresupuesto: lead.numero_presupuesto,
      fecha: new Date(lead.created_at).toLocaleDateString("es-UY", { year: "numeric", month: "long", day: "numeric" }),
      cliente: { nombre: body.nombre, email: body.email, telefono: body.telefono, empresa: body.empresa },
      cotizacion,
      logoUrl,
      panelUrl,
    });

    // Enviar presupuesto por email con Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const emailResult = await resend.emails.send({
        from: "FACILIA <onboarding@resend.dev>",
        to: lead.email,
        subject: `Presupuesto ${lead.numero_presupuesto} - FACILIA`,
        html: `
          <h2>Presupuesto FACILIA</h2>
          <p>Hola ${lead.nombre || ""},</p>
          <p>Adjuntamos tu presupuesto ${lead.numero_presupuesto}.</p>
          <p>Gracias por confiar en FACILIA.</p>
        `,
        attachments: [
          {
            filename: `${lead.numero_presupuesto}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      console.log("RESEND RESULT:", emailResult);
    } else {
      console.log("RESEND_API_KEY no configurada");
    }

    return NextResponse.json({ ok: true, lead, cotizacion });
  } catch (err: any) {
    console.error("Error creando lead:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error al procesar el presupuesto" },
      { status: 400 }
    );
  }
}

/**
 * GET /api/leads
 * Lista los leads para el panel interno. Requiere sesión (ver middleware.ts).
 * Soporta ?estado=nuevo|contactado|aceptado|perdido y ?q=busqueda
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const q = searchParams.get("q");

  let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (estado) query = query.eq("estado", estado);
  if (q) query = query.or(`nombre.ilike.%${q}%,email.ilike.%${q}%,empresa.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, leads: data });
}


