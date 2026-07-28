"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

interface ComercialNavItem {
  key: string;
  href: string;
  label: string;
  icon: string;
  disponible: boolean;
}

const ITEMS: ComercialNavItem[] = [
  { key: "catalogos", href: "/dashboard/comercial/catalogos", label: "Catálogos", icon: "📦", disponible: true },
  { key: "tarifas", href: "/dashboard/comercial/tarifas", label: "Tarifas", icon: "💰", disponible: true },
  { key: "costos", href: "/dashboard/comercial/costos", label: "Costos Internos", icon: "📉", disponible: true },
  { key: "reglas", href: "/dashboard/comercial/reglas", label: "Reglas del Motor", icon: "⚙️", disponible: false },
  { key: "planes", href: "/dashboard/comercial/planes", label: "Planes Comerciales", icon: "⭐", disponible: true },
];

interface ComercialNavProps {
  /** Si es false (rol admin), se oculta la pestaña de Costos Internos. */
  mostrarCostos?: boolean;
}

export default function ComercialNav({ mostrarCostos = true }: ComercialNavProps) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => item.key !== "costos" || mostrarCostos);

  return (
    <nav className="flex flex-wrap gap-2 border-b border-navy-100 pb-4 mb-8">
      {items.map((item) => {
        const active = pathname?.startsWith(item.href);
        const content = (
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-display font-semibold transition-colors",
              active
                ? "bg-orange text-white shadow-soft"
                : item.disponible
                  ? "text-navy hover:bg-navy-50"
                  : "text-ink/30 cursor-not-allowed"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
            {!item.disponible && (
              <span className="ml-1 text-[10px] font-medium uppercase tracking-wide bg-navy-50 text-ink/40 rounded-full px-2 py-0.5">
                Próximamente
              </span>
            )}
          </span>
        );

        return item.disponible ? (
          <Link key={item.key} href={item.href}>
            {content}
          </Link>
        ) : (
          <span key={item.key}>{content}</span>
        );
      })}
    </nav>
  );
}
