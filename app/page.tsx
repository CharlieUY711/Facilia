import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Card from "@/components/Card";
import Button from "@/components/Button";

const SERVICIOS = [
  {
    icon: "🧴",
    nombre: "FACILIA Clean",
    desc: "Limpieza profesional con protocolos estandarizados que garantizan higiene y ambientes saludables en cada espacio.",
    items: ["Protocolos estandarizados", "Higiene y sanitización", "Ambientes saludables"],
    img: "/Oficina2.png",
  },
  {
    icon: "🛠️",
    nombre: "FACILIA Care",
    desc: "Mantenimiento preventivo y correctivo liviano que asegura la continuidad operativa de tus instalaciones.",
    items: ["Mantenimiento preventivo", "Mantenimiento correctivo", "Continuidad de instalaciones"],
    img: "/Mantenimiento1.png",
  },
  {
    icon: "🕐",
    nombre: "FACILIA Continuity",
    desc: "Gestión integral de los recursos críticos para asegurar la continuidad operativa de tu empresa.",
    items: ["Monitoreo permanente", "Reposición planificada", "Disponibilidad garantizada"],
    img: "/Continuidad_operativa1.png",
  },
];

const RAZONES = [
  "Un único proveedor",
  "Procesos estandarizados",
  "Personal capacitado",
  "Gestión integral",
  "Reportes periódicos",
  "Respaldo de ODDY",
];

export default function LandingPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-50/60 to-paper">
        <Image
          src="/Oficina1.png"
          alt=""
          aria-hidden="true"
          fill
          priority
          className="object-cover opacity-[0.20]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/70 to-paper" />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8 pt-20 pb-0 text-center">
          <h1 className="font-display font-bold text-navy leading-[1.05] mb-6 animate-fadeUp">
            <span className="block text-xl xs:text-2xl sm:text-4xl">No vendemos productos. No vendemos horas.</span>
            <span className="block text-xl xs:text-2xl sm:text-4xl text-orange">Entregamos continuidad operativa.</span>
          </h1>
          <p className="max-w-3xl mx-auto text-ink/90 text-lg mb-12 animate-fadeUp">
            FACILIA es el socio que asegura que las instalaciones de tu empresa funcionen de forma
            eficiente, limpia y sin interrupciones. Integramos limpieza, mantenimiento y gestión de
            recursos críticos bajo un mismo proveedor, con procesos estandarizados y foco en la
            prevención. Nuestro objetivo no es prestar un servicio: es garantizarte confiabilidad y
            continuidad, para que puedas dedicarte por completo a hacer crecer tu negocio.
          </p>
          <div className="flex items-center justify-center gap-4 animate-fadeUp">
            <Link href="/cotizador">
              <Button size="md">Cotizar mi servicio →</Button>
            </Link>
            <Link href="#servicios">
              <Button size="md" variant="ghost">Ver servicios</Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-3 mt-10 animate-fadeUp">
            {["/Oficina1.png", "/Oficina2.png", "/Mantenimiento1.png", "/Continuidad_operativa1.png", "/Continuidad_operativa2.png"].map((src) => (
              <div key={src} className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden shadow-card border border-navy-100">
                <Image src={src} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 pb-20">
        <div className="text-center mb-14">
          <p className="text-orange font-semibold text-sm uppercase tracking-wide mb-2">La unidad de Facility Services de ODDY</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-navy">Tres líneas, un solo estándar</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {SERVICIOS.map((s) => (
            <Card key={s.nombre} className="relative overflow-hidden hover:shadow-soft transition-shadow">
              <Image
                src={s.img}
                alt=""
                aria-hidden="true"
                fill
                className="object-cover opacity-[0.40]"
              />
              <div className="absolute inset-0 bg-white/60" />
              <div className="relative">
                <h3 className="font-display font-semibold text-lg text-navy mb-2">{s.nombre}</h3>
                <p className="text-sm text-ink/80 mb-4">{s.desc}</p>
                <ul className="space-y-1.5 border-t border-navy-100 pt-4">
                  {s.items.map((item) => (
                    <li key={item} className="text-sm text-ink/90 flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-orange" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Por qué FACILIA */}
      <section id="por-que" className="relative overflow-hidden bg-navy-50/50 py-20">
        <Image
          src="/Continuidad_operativa2.png"
          alt=""
          aria-hidden="true"
          fill
          className="object-cover opacity-[0.08]"
        />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <h2 className="font-display font-bold text-3xl text-navy text-center mb-10">¿Por qué FACILIA?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {RAZONES.map((r) => (
              <div
                key={r}
                className="flex items-center gap-2 bg-white border border-navy-100 rounded-full px-5 py-2.5 text-sm font-medium text-navy shadow-card"
              >
                <span className="text-orange">✓</span>
                {r}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-24 text-center">
        <h2 className="font-display font-bold text-3xl sm:text-4xl text-navy mb-4">
          Vos te ocupás de tu negocio.
          <br />
          <span className="text-orange">Nosotros garantizamos que tu espacio nunca se detenga.</span>
        </h2>
        <p className="text-ink/60 mb-8">Cotizá tu servicio en menos de 2 minutos y recibí tu presupuesto al instante.</p>
        <Link href="/cotizador">
          <Button size="lg">Empezar cotización →</Button>
        </Link>
      </section>

      <Footer />
    </>
  );
}
