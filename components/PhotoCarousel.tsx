"use client";

import Image from "next/image";

interface Foto {
  src: string;
  alt: string;
}

const FOTOS: Foto[] = [
  { src: "/Oficina1.png", alt: "Oficina mantenida por FACILIA" },
  { src: "/Oficina2.png", alt: "Limpieza profesional de oficinas" },
  { src: "/Mantenimiento1.png", alt: "Mantenimiento preventivo de instalaciones" },
  { src: "/Continuidad_operativa1.png", alt: "Gestión de recursos críticos" },
  { src: "/Continuidad_operativa2.png", alt: "Continuidad operativa FACILIA" },
];

// Se duplica la lista para que el loop de la animación sea continuo (sin salto).
const TIRA = [...FOTOS, ...FOTOS];

export default function PhotoCarousel() {
  return (
    <section className="py-10">
      <div className="relative overflow-hidden">
        {/* degradés en los bordes para que no corte feo */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-paper to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-paper to-transparent" />

        <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
          {TIRA.map((f, i) => (
            <div
              key={`${f.src}-${i}`}
              className="relative h-20 w-32 sm:h-24 sm:w-40 shrink-0 mx-2 rounded-xl overflow-hidden border border-navy-100 shadow-card"
            >
              <Image src={f.src} alt={f.alt} fill className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
