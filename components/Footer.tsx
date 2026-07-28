import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-navy text-white/80 mt-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <Image src="/Oddy.png" alt="ODDY" width={36} height={36} />
          <div>
            <p className="text-white font-display font-semibold">FACILIA</p>
            <p className="text-xs text-white/50">Facility Services by ODDY</p>
          </div>
        </div>
        <div className="text-sm space-y-1">
          <p>LIMPIEZA · MANTENIMIENTO · CONTINUIDAD OPERATIVA</p>
          <p className="text-white/50">contacto@oddy.com.uy · www.facilia.oddy.com.uy · Montevideo, Uruguay</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center text-xs text-white/40">
        <span>© {new Date().getFullYear()} ODDY — On Demand Delivery. Todos los derechos reservados.</span>
        <span className="hidden sm:inline">·</span>
        <Link href="/panel/login" className="hover:text-white/70 transition-colors underline underline-offset-2">
          Acceso interno
        </Link>
      </div>
    </footer>
  );
}
