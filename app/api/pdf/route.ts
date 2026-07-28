import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { generatePresupuestoPdf } from "@/lib/pdf";
import { CotizacionResult } from "@/lib/calculatePrice";

interface PdfRequestBody {
  numeroPresupuesto: string;
  cliente: { nombre: string; email: string; telefono?: string; empresa?: string };
  cotizacion: CotizacionResult;
  panelUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PdfRequestBody;

    if (!body.cliente?.nombre || !body.cliente?.email || !body.cotizacion) {
      return NextResponse.json({ ok: false, error: "Faltan datos del cliente o de la cotización" }, { status: 400 });
    }

    const logoPath = path.join(process.cwd(), "public", "FACILIA_By.png");
    const logoBase64 = fs.readFileSync(logoPath).toString("base64");
    const logoUrl = `data:image/png;base64,${logoBase64}`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const panelUrl = body.panelUrl || `${siteUrl}/lead/pendiente`;

    const pdfBuffer = await generatePresupuestoPdf({
      numeroPresupuesto: body.numeroPresupuesto,
      fecha: new Date().toLocaleDateString("es-UY", { year: "numeric", month: "long", day: "numeric" }),
      cliente: body.cliente,
      cotizacion: body.cotizacion,
      logoUrl,
      panelUrl,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${body.numeroPresupuesto}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Error generando PDF:", err);
    return NextResponse.json({ ok: false, error: "Error al generar el PDF" }, { status: 500 });
  }
}
