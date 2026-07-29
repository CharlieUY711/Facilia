import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur-md border-b border-navy-100/50">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/FACILIA_By.png" alt="FACILIA — Facility Services by ODDY" width={150} height={39} priority />
        </Link>
        <nav className="hidden sm:flex items-center gap-8 font-body text-sm text-navy/80">
          <Link href="/#servicios" className="hover:text-orange transition-colors">Servicios</Link>
          <Link href="/#por-que" className="hover:text-orange transition-colors">Por qué FACILIA</Link>
          <Link href="/panel/login" className="hover:text-orange transition-colors">Ingreso / Registro</Link>
          <Link
            href="/cotizador"
            className="bg-orange text-white px-5 py-2 rounded-xl font-semibold hover:bg-orange-700 transition-colors shadow-soft"
          >
            Cotizar ahora
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:hidden">
          <Link
            href="/panel/login"
            className="text-navy/70 px-3 py-2 rounded-xl text-sm font-semibold border border-navy-100"
          >
            Ingreso / Registro
          </Link>
          <Link
            href="/cotizador"
            className="bg-orange text-white px-4 py-2 rounded-xl text-sm font-semibold"
          >
            Cotizar
          </Link>
        </div>
      </div>
    </header>
  );
}
