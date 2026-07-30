"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Legajo from "@/components/rrhh/Legajo";

export default function MiLegajoPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/panel/login");
        return;
      }

      const res = await fetch("/api/rrhh/mi-legajo").then((r) => r.json());
      if (res.ok) {
        setPersonaId(res.persona.id);
      } else {
        setError(res.error || "No se pudo cargar tu legajo");
      }
      setChecking(false);
    })();
  }, [router]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40">Cargando...</div>;
  }

  if (error || !personaId) {
    return (
      <div className="min-h-screen bg-paper">
        <DashboardHeader />
        <main className="max-w-screen-2xl mx-auto px-5 sm:px-8 py-10">
          <Card>
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        </main>
      </div>
    );
  }

  return <Legajo personaId={personaId} mode="self" />;
}
