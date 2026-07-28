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
  },
  {
    icon: "🛠️",
    nombre: "FACILIA Care",
    desc: "Mantenimiento preventivo y correctivo liviano que asegura la continuidad operativa de tus instalaciones.",
    items: ["Mantenimiento preventivo", "Mantenimiento correctivo", "Continuidad de instalaciones"],
  },
  {
    icon: "🕐",
    nombre: "FACILIA Continuity",
    desc: "Gestión integral de los recursos críticos para asegurar la continuidad operativa de tu empresa.",
    items: ["Monitoreo permanente", "Reposición planificada", "Disponibilidad garantizada"],
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
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-24 text-center">
          <p className="inline-block bg-orange-50 text-orange font-semibold text-xs tracking-wide uppercase px-3 py-1.5 rounded-full mb-6 animate-fadeUp">
            La unidad de Facility Services de ODDY
          </p>
          <h1 className="font-display font-bold text-4xl sm:text-6xl text-navy leading-[1.05] mb-5 animate-fadeUp">
            No vendemos productos. No vendemos horas.
            <br />
            <span className="text-orange">Entregamos continuidad operativa.</span>
          </h1>
          <p className="max-w-xl mx-auto text-ink/70 text-lg mb-10 animate-fadeUp">
            FACILIA es el socio que asegura que las instalaciones de tu empresa funcionen de forma
            eficiente, limpia y sin interrupciones. Integramos limpieza, mantenimiento y gestión de
            recursos críticos bajo un mismo proveedor, con procesos estandarizados y foco en la
            prevención. Nuestro objetivo no es prestar un servicio: es garantizarte confiabilidad y
            continuidad, para que puedas dedicarte por completo a hacer crecer tu negocio.
          </p>
          <div className="flex items-center justify-center gap-4 animate-fadeUp">
            <Link href="/cotizador">
              <Button size="lg">Cotizar mi servicio →</Button>
            </Link>
            <Link href="#servicios">
              <Button size="lg" variant="ghost">Ver servicios</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-orange font-semibold text-sm uppercase tracking-wide mb-2">Facility Services by ODDY</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-navy">Tres líneas, un solo estándar</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {SERVICIOS.map((s) => (
            <Card key={s.nombre} className="hover:shadow-soft transition-shadow">
              <div className="text-3xl mb-4">{s.icon}</div>
              <h3 className="font-display font-semibold text-lg text-navy mb-2">{s.nombre}</h3>
              <p className="text-sm text-ink/60 mb-4">{s.desc}</p>
              <ul className="space-y-1.5 border-t border-navy-100 pt-4">
                {s.items.map((item) => (
                  <li key={item} className="text-sm text-ink/70 flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-orange" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* Por qué FACILIA */}
      <section id="por-que" className="bg-navy-50/50 py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
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
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-24 text-center">
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
