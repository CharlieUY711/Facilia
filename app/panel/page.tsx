"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Select from "@/components/Select";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ViewTabBar from "@/components/dashboard/ViewTabBar";
import { formatCurrency } from "@/lib/formatCurrency";

interface Lead {
  id: string;
  created_at: string;
  nombre: string | null;
  email: string;
  telefono: string | null;
  empresa: string | null;
  ambientes: { tipo_ambiente: string; m2: number }[];
  precio_mensual: number;
  numero_presupuesto: string;
  estado: "nuevo" | "contactado" | "aceptado" | "perdido";
}

const ESTADO_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  aceptado: "Aceptado",
  perdido: "Perdido",
};

const ESTADO_COLOR: Record<string, string> = {
  nuevo: "bg-blue-100 text-blue-700",
  contactado: "bg-orange-100 text-orange-700",
  aceptado: "bg-green-100 text-green-700",
  perdido: "bg-red-100 text-red-700",
};

export default function PanelPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro]);

  async function fetchLeads() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (estadoFiltro) qs.set("estado", estadoFiltro);
    const res = await fetch(`/api/leads?${qs.toString()}`);
    const data = await res.json();
    if (data.ok) setLeads(data.leads);
    setLoading(false);
  }

  const filtrados = useMemo(() => {
    if (!busqueda) return leads;
    const q = busqueda.toLowerCase();
    return leads.filter(
      (l) => (l.nombre ?? "").toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.empresa?.toLowerCase().includes(q)
    );
  }, [leads, busqueda]);

  const metricas = useMemo(() => {
    const total = leads.length;
    const aceptados = leads.filter((l) => l.estado === "aceptado").length;
    const mrr = leads.filter((l) => l.estado === "aceptado").reduce((a, l) => a + l.precio_mensual, 0);
    const tasaConversion = total ? Math.round((aceptados / total) * 100) : 0;
    return { total, aceptados, mrr, tasaConversion };
  }, [leads]);

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader title="Panel de leads" active="cotizaciones" />

      <main className="max-w-screen-2xl mx-auto px-5 sm:px-8 py-10">
        <div className="mb-8">
          <ViewTabBar
            title="Panel de leads"
            rightSlot={
              <>
                <Input
                  placeholder="Buscar por nombre, email o empresa..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="!py-2 w-56"
                />
                <Select
                  placeholder="Todos los estados"
                  options={Object.entries(ESTADO_LABEL).map(([value, label]) => ({ value, label }))}
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  className="!py-2 w-44"
                />
              </>
            }
          />
        </div>

        {/* Métricas */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Card className="flex-1 min-w-[200px] flex items-center justify-between gap-3 !py-3">
            <p className="text-xs text-ink/50 uppercase">Total leads</p>
            <p className="font-display font-bold text-xl text-navy">{metricas.total}</p>
          </Card>
          <Card className="flex-1 min-w-[200px] flex items-center justify-between gap-3 !py-3">
            <p className="text-xs text-ink/50 uppercase">Aceptados</p>
            <p className="font-display font-bold text-xl text-navy">{metricas.aceptados}</p>
          </Card>
          <Card className="flex-1 min-w-[200px] flex items-center justify-between gap-3 !py-3">
            <p className="text-xs text-ink/50 uppercase">Tasa de conversión</p>
            <p className="font-display font-bold text-xl text-navy">{metricas.tasaConversion}%</p>
          </Card>
          <Card className="flex-1 min-w-[200px] flex items-center justify-between gap-3 !py-3">
            <p className="text-xs text-ink/50 uppercase">MRR (aceptados)</p>
            <p className="font-display font-bold text-xl text-orange">{formatCurrency(metricas.mrr)}</p>
          </Card>
        </div>

        {/* Tabla */}
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50/50 text-ink/50 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3">Presupuesto</th>
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-5 py-3">Servicio</th>
                <th className="text-left px-5 py-3">Mensual</th>
                <th className="text-left px-5 py-3">Estado</th>
                <th className="text-left px-5 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="text-center py-10 text-ink/40">Cargando leads...</td></tr>
              )}
              {!loading && filtrados.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-ink/40">No hay leads todavía.</td></tr>
              )}
              {filtrados.map((lead) => (
                <tr key={lead.id} className="border-t border-navy-100 hover:bg-navy-50/30 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/lead/${lead.id}`} className="text-blue font-medium hover:underline">
                      {lead.numero_presupuesto}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{lead.nombre || lead.telefono || "(sin nombre)"}</p>
                    <p className="text-xs text-ink/50">{lead.email}</p>
                  </td>
                  <td className="px-5 py-3 text-ink/70">
                    {lead.ambientes?.length ?? 0} ambiente{(lead.ambientes?.length ?? 0) === 1 ? "" : "s"} ·{" "}
                    {(lead.ambientes ?? []).reduce((acc, a) => acc + Number(a.m2), 0)} m²
                  </td>
                  <td className="px-5 py-3 font-medium">{formatCurrency(lead.precio_mensual)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_COLOR[lead.estado]}`}>
                      {ESTADO_LABEL[lead.estado]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink/50">{new Date(lead.created_at).toLocaleDateString("es-UY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </div>
  );
}




