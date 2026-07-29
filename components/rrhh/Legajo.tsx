"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ViewTabBar from "@/components/dashboard/ViewTabBar";
import { ESTADO_LABORAL_LABEL, type PersonaLegajo } from "@/lib/rrhh/types";
import ResumenTab from "./ResumenTab";
import LegalTab from "./LegalTab";
import EvolucionTab from "./EvolucionTab";
import TareasTab from "./TareasTab";
import ComunicadosTab from "./ComunicadosTab";

type Tab = "resumen" | "legal" | "evolucion" | "tareas" | "comunicados";

const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "legal", label: "Legal" },
  { id: "evolucion", label: "Evolución" },
  { id: "tareas", label: "Tareas" },
  { id: "comunicados", label: "Comunicados" },
];

interface LegajoProps {
  personaId: string;
  /** "admin": Admin/Super Admin viendo el legajo de un colaborador
   * desde /dashboard/personal. "self": el propio colaborador en modo
   * autoservicio desde /dashboard/mi-legajo (sin poder editar sus
   * datos legales ni tareas de otros). */
  mode: "admin" | "self";
}

export default function Legajo({ personaId, mode }: LegajoProps) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [persona, setPersona] = useState<PersonaLegajo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/rrhh/personas/${personaId}`).then((r) => r.json());
    if (res.ok) {
      setPersona(res.persona);
      setError(null);
    } else {
      setError(res.error || "No se pudo cargar el legajo");
    }
    setLoading(false);
  }, [personaId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40">Cargando...</div>;
  }

  if (error || !persona) {
    return (
      <div className="min-h-screen bg-paper">
        <DashboardHeader />
        <main className="max-w-screen-2xl mx-auto px-5 sm:px-8 py-10">
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        </main>
      </div>
    );
  }

  const nombreCompleto = [persona.nombre, persona.apellido].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader />

      <main className="max-w-screen-2xl mx-auto px-5 sm:px-8 py-10 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display font-bold text-3xl text-navy">{nombreCompleto}</h1>
          <span className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-navy-50 text-navy/70">
            {ESTADO_LABORAL_LABEL[persona.estado_laboral]}
          </span>
          {persona.cargo && <span className="text-sm text-ink/60">{persona.cargo}</span>}
        </div>

        <ViewTabBar
          title="Legajo"
          tabs={TABS}
          activeTab={tab}
          onTabChange={(id) => setTab(id as Tab)}
          backHref={mode === "admin" ? "/dashboard/personal" : "/dashboard"}
        />

        {tab === "resumen" && <ResumenTab persona={persona} />}
        {tab === "legal" && <LegalTab persona={persona} mode={mode} onPersonaUpdated={setPersona} />}
        {tab === "evolucion" && <EvolucionTab personaId={persona.id} mode={mode} />}
        {tab === "tareas" && <TareasTab personaId={persona.id} mode={mode} />}
        {tab === "comunicados" && <ComunicadosTab personaId={persona.id} mode={mode} />}
      </main>
    </div>
  );
}
