"use client";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ViewTabBar from "@/components/dashboard/ViewTabBar";
import CotizadorForm from "@/components/CotizadorForm";

// Misma pantalla del cotizador que usa el sitio público (/cotizador), pero
// embebida dentro del shell del dashboard: no se sale del panel interno,
// y como el usuario está logueado, /api/leads detecta la sesión y guarda
// el presupuesto con su usuario (columna leads.created_by).
export default function NuevaCotizacionPage() {
  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader />

      <main className="max-w-screen-2xl mx-auto px-5 sm:px-8 py-10 space-y-8">
        <ViewTabBar title="Nueva cotización" />

        <div className="max-w-4xl mx-auto">
          <CotizadorForm />
        </div>
      </main>
    </div>
  );
}
