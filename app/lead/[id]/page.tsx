"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Card from "@/components/Card";
import Button from "@/components/Button";
import PDFPreview from "@/components/PDFPreview";
import { formatCurrency } from "@/lib/formatCurrency";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mostrarVisita, setMostrarVisita] = useState(false);
  const [visita, setVisita] = useState({
    fecha: "",
    hora: "09:00",
    responsable_id: "",
    notas: ""
  });

  useEffect(() => {
    fetchLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchLead() {
    setLoading(true);
    const res = await fetch(`/api/leads/${id}`);
    const data = await res.json();
    if (data.ok) setLead(data.lead);
    setLoading(false);
  }

  async function updateEstado(estado: string) {
    setActionLoading(estado);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    const data = await res.json();
    if (data.ok) setLead(data.lead);
    setActionLoading(null);
  }

  async function guardarVisita() {

    setActionLoading("visita");

    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        accion:"crear_visita",
        fecha: visita.fecha,
        hora: visita.hora,
        responsable_id: visita.responsable_id || null,
        notas: visita.notas
      })
    });

    const data = await res.json();

    if(data.ok){
      setMessage("Visita programada correctamente");
      setMostrarVisita(false);
      fetchLead();
    } else {
      setMessage(data.error || "Error creando visita");
    }

    setActionLoading(null);
}
if (loading) return <div className="min-h-screen flex items-center justify-center text-ink/40">Cargando...</div>;
  if (!lead) return <div className="min-h-screen flex items-center justify-center text-ink/40">Lead no encontrado.</div>;

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const panelUrl = `${siteUrl}/lead/${lead.id}`;

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-white border-b border-navy-100">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Image src="/FACILIA_By.png" alt="FACILIA" width={120} height={30} />
          <button onClick={() => router.push("/panel")} className="text-sm text-blue hover:underline">
            ← Volver al panel
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-navy">{lead.numero_presupuesto}</h1>
            <p className="text-ink/50 text-sm">Creado el {new Date(lead.created_at).toLocaleDateString("es-UY")}</p>
<p className="text-sm font-semibold text-blue mt-2">Estado actual: {lead.estado}</p>
<p className="text-sm font-semibold text-blue mt-2">
  Estado: {lead.estado}
</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setMostrarVisita(true)}
              loading={actionLoading === "visita"}
            >
              Programar visita
            </Button>
            <Button variant="danger" size="sm" onClick={() => updateEstado("perdido")} loading={actionLoading === "perdido"}>
              Marcar perdido
            </Button>
          </div>
        </div>


        {message && <p className="text-sm text-navy bg-navy-50 rounded-xl px-4 py-2">{message}</p>}

        <div className="grid sm:grid-cols-2 gap-6">
          <Card>
            <p className="font-display font-semibold text-navy mb-3">Cliente</p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink/50">Nombre</dt><dd>{lead.nombre || "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/50">Email</dt><dd>{lead.email}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/50">Teléfono</dt><dd>{lead.telefono || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/50">Empresa</dt><dd>{lead.empresa || "—"}</dd></div>
            </dl>
          </Card>
          <Card>
            <p className="font-display font-semibold text-navy mb-3">Servicio</p>
            <dl className="space-y-1.5 text-sm">
              {(lead.detalle?.ambientes ?? lead.ambientes ?? []).map((a: any, i: number) => (
                <div className="flex justify-between" key={i}>
                  <dt className="text-ink/50">{a.label ?? a.tipo_ambiente}</dt>
                  <dd>{a.m2} m²</dd>
                </div>
              ))}
              <div className="flex justify-between"><dt className="text-ink/50">Frecuencia</dt><dd>{lead.frecuencia}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total mensual</dt><dd className="text-orange">{formatCurrency(lead.precio_mensual)}</dd></div>
            </dl>
          </Card>
        </div>


        {mostrarVisita && (
  <Card>

    <p className="font-display font-semibold text-navy mb-4">
      Programar visita FACILIA
    </p>


    <div className="space-y-4">


      <div className="grid sm:grid-cols-2 gap-4">

        <div>
          <label className="text-sm text-ink/60">
            Fecha
          </label>

          <input
            type="date"
            className="border rounded-lg p-2 w-full"
            value={visita.fecha}
            onChange={(e)=>setVisita({
              ...visita,
              fecha:e.target.value
            })}
          />
        </div>


        <div>
          <label className="text-sm text-ink/60">
            Hora
          </label>

          <input
            type="time"
            className="border rounded-lg p-2 w-full"
            value={visita.hora}
            onChange={(e)=>setVisita({
              ...visita,
              hora:e.target.value
            })}
          />
        </div>

      </div>



      <div className="grid sm:grid-cols-2 gap-4">


        <div>

          <label className="text-sm text-ink/60">
            Responsable FACILIA
          </label>

          <input
            className="border rounded-lg p-2 w-full"
            placeholder="Responsable de visita"
            value={visita.responsable_id}
            onChange={(e)=>setVisita({
              ...visita,
              responsable_id:e.target.value
            })}
          />

        </div>



        <div>

          <label className="text-sm text-ink/60">
            Coordinado con
          </label>


          <div className="border rounded-lg p-3 bg-gray-50">

            <p className="font-semibold">
              {lead.nombre || "-"}
            </p>

            <p>
              {lead.empresa || ""}
            </p>

            <p>
              {lead.telefono || ""}
            </p>

            <p>
              {lead.email}
            </p>

          </div>


        </div>


      </div>



      <div>

        <label className="text-sm text-ink/60">
          Notas
        </label>


        <textarea
          className="border rounded-lg p-2 w-full"
          rows={3}
          value={visita.notas}
          onChange={(e)=>setVisita({
            ...visita,
            notas:e.target.value
          })}
        />

      </div>



      <Button
        variant="secondary"
        onClick={guardarVisita}
        loading={actionLoading==="visita"}
      >
        Confirmar visita
      </Button>


    </div>


  </Card>
)}

        <Card>
          <p className="font-display font-semibold text-navy mb-3">Detalle del presupuesto</p>
          <ul className="divide-y divide-navy-100">
            {lead.detalle?.lineas?.map((l: any, i: number) => (
              <li key={i} className="flex justify-between py-2 text-sm">
                <span className="text-ink/70">{l.concepto}</span>
                <span className="font-medium">{formatCurrency(l.monto_mensual)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <p className="font-display font-semibold text-navy mb-3">PDF</p>
          <PDFPreview
            numeroPresupuesto={lead.numero_presupuesto}
            cliente={{ nombre: lead.nombre, email: lead.email, telefono: lead.telefono, empresa: lead.empresa }}
            cotizacion={lead.detalle}
            panelUrl={panelUrl}
          />
        </Card>
      </main>
    </div>
  );
}













