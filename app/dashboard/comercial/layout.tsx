"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import ComercialNav from "@/components/comercial/ComercialNav";
import type { Role } from "@/lib/roles";

/**
 * Mismo patrón de control de acceso que app/dashboard/usuarios/page.tsx:
 * chequeo client-side de sesión + rol, con estados "checking"/"loading"
 * separados para no mostrar el contenido antes de confirmar el acceso.
 * middleware.ts ya protege /dashboard/:path* por sesión; acá se agrega
 * el filtro por rol (admin / super_admin), igual que en /dashboard/usuarios.
 */
export default function ComercialLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAccess() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/panel/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = (profile?.role as Role) ?? "usuario";

    if (userRole !== "admin" && userRole !== "super_admin") {
      router.push("/dashboard");
      return;
    }

    setRole(userRole);
    setChecking(false);
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-white border-b border-navy-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Image src="/FACILIA_By.png" alt="FACILIA" width={120} height={30} />
          <Link href="/dashboard" className="text-sm text-ink/60 hover:text-navy transition-colors">
            ← Volver al dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        <div className="mb-2">
          <p className="text-orange font-semibold text-sm uppercase tracking-wide mb-1">
            FACILIA Commercial Engine
          </p>
          <h1 className="font-display font-bold text-3xl text-navy">Configuración Comercial</h1>
          <p className="text-ink/60 text-sm mt-1">
            Catálogos, tarifas, costos internos y planes que usa el motor comercial.
          </p>
        </div>

        <ComercialNav mostrarCostos={role === "super_admin"} />

        {children}
      </main>
    </div>
  );
}
