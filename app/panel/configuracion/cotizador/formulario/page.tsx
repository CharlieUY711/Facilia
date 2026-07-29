"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import CotizadorFormularioAdmin from "@/components/CotizadorFormularioAdmin";

export default function CotizadorFormularioPage() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/panel/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-white border-b border-navy-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src="/FACILIA_By.png" alt="FACILIA" width={120} height={30} />
            <Link href="/dashboard" className="text-sm text-ink/50 hover:text-navy transition-colors">
              ← Volver al Dashboard
            </Link>
          </div>
          <button onClick={handleLogout} className="text-sm text-ink/60 hover:text-navy transition-colors">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
        <CotizadorFormularioAdmin />
      </main>
    </div>
  );
}
