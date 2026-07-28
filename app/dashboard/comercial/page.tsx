"use client";

import Link from "next/link";
import Card from "@/components/Card";

const SECCIONES = [
  {
    key: "catalogos",
    href: "/dashboard/comercial/catalogos",
    icon: "📦",
    titulo: "Catálogos",
    descripcion: "Servicios comerciales: alta, edición y estado.",
  },
  {
    key: "tarifas",
    href: "/dashboard/comercial/tarifas",
    icon: "💰",
    titulo: "Tarifas",
    descripcion: "Precios vigentes por servicio, con historial versionado.",
  },
  {
    key: "costos",
    href: "/dashboard/comercial/costos",
    icon: "📉",
    titulo: "Costos Internos",
    descripcion: "Márgenes reales de FACILIA. Solo Super Admin.",
  },
  {
    key: "reglas",
    href: "/dashboard/comercial/reglas",
    icon: "⚙️",
    titulo: "Reglas del Motor",
    descripcion: "Recargos, descuentos y condiciones del cotizador.",
  },
  {
    key: "planes",
    href: "/dashboard/comercial/planes",
    icon: "⭐",
    titulo: "Planes Comerciales",
    descripcion: "Bundles de servicios vendidos como paquete.",
  },
];

export default function ComercialHomePage() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {SECCIONES.map((s) => (
        <Link key={s.key} href={s.href}>
          <Card className="h-full hover:shadow-soft hover:border-orange/40 transition-all cursor-pointer">
            <div className="text-2xl mb-3">{s.icon}</div>
            <p className="font-display font-semibold text-navy mb-1">{s.titulo}</p>
            <p className="text-sm text-ink/60">{s.descripcion}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
