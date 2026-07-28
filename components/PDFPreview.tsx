"use client";

import { useState } from "react";
import Button from "./Button";

interface PDFPreviewProps {
  numeroPresupuesto: string;
  cliente: { nombre: string; email: string; telefono?: string; empresa?: string };
  cotizacion: any;
  panelUrl: string;
}

export default function PDFPreview({ numeroPresupuesto, cliente, cotizacion, panelUrl }: PDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPdf() {
    setLoading(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroPresupuesto, cliente, cotizacion, panelUrl }),
      });
      const blob = await res.blob();
      setPdfUrl(URL.createObjectURL(blob));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!pdfUrl ? (
        <Button variant="secondary" onClick={loadPdf} loading={loading}>
          Ver PDF del presupuesto
        </Button>
      ) : (
        <div className="space-y-3">
          <iframe src={pdfUrl} className="w-full h-[600px] rounded-xl border border-navy-100" />
          <a href={pdfUrl} download={`${numeroPresupuesto}.pdf`}>
            <Button variant="ghost" size="sm">Descargar PDF</Button>
          </a>
        </div>
      )}
    </div>
  );
}
