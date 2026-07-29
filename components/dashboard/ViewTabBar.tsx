"use client";

import { ReactNode } from "react";
import Link from "next/link";

export interface ViewTab {
  id: string;
  label: string;
}

interface ViewTabBarProps {
  /** Título de la vista, se muestra a la izquierda. */
  title: string;
  /** Tabs de la vista, se muestran centrados. Si se omite, el centro queda vacío. */
  tabs?: ViewTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  /** Contenido extra (buscador, filtros, botón de acción) entre los tabs y "Volver". */
  rightSlot?: ReactNode;
  backHref?: string;
}

// Barra reutilizada en todas las vistas del dashboard (Cotizaciones,
// Directorio, Cotizador): título a la izquierda, tabs de la vista
// centrados, contenido extra (buscador/acciones) y "Volver" a la derecha.
// Misma estructura y estilos en las tres vistas para mantener todo consistente.
export default function ViewTabBar({ title, tabs, activeTab, onTabChange, rightSlot, backHref = "/dashboard" }: ViewTabBarProps) {
  return (
    <nav className="flex items-center gap-4 border-b border-navy-100 pb-3">
      <span className="font-display font-semibold text-navy text-2xl shrink-0">{title}</span>

      <div className="flex-1 flex flex-wrap justify-center gap-2">
        {tabs?.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange?.(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === t.id ? "bg-navy text-white" : "text-ink/60 hover:bg-navy-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}

      <Link
        href={backHref}
        className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium text-ink/60 hover:text-navy hover:bg-navy-50 transition-colors"
      >
        Volver
      </Link>
    </nav>
  );
}
