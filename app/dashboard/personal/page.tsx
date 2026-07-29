"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import Input from "@/components/Input";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ViewTabBar from "@/components/dashboard/ViewTabBar";
import { ESTADO_LABORAL_LABEL, type PersonaLegajo } from "@/lib/rrhh/types";

export default function PersonalListPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [personas, setPersonas] = useState<PersonaLegajo[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAccessAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAccessAndLoad() {
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

    if (profile?.role !== "super_admin" && profile?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    setChecking(false);
    await load();
  }

  async function load() {
    setLoadingData(true);
    const res = await fetch("/api/rrhh/personas").then((r) => r.json());
    if (res.ok) setPersonas(res.personas);
    else setError(res.error || "No se pudo cargar la lista");
    setLoadingData(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return personas;
    return personas.filter((p) =>
      [p.nombre, p.apellido, p.cargo, p.organizaciones?.nombre]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [personas, search]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader />

      <main className="max-w-screen-2xl mx-auto px-5 sm:px-8 py-10 space-y-6">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              ×
            </button>
          </p>
        )}

        <ViewTabBar
          title="Personal"
          rightSlot={
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="!py-2 w-40 sm:w-48"
            />
          }
        />

        {loadingData ? (
          <p className="text-sm text-ink/40">Cargando...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <p className="text-sm text-ink/40">No hay colaboradores todavía.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Link key={p.id} href={`/dashboard/personal/${p.id}`}>
                <Card className="h-full hover:shadow-soft transition-shadow cursor-pointer">
                  <p className="font-display font-semibold text-navy">
                    {p.nombre} {p.apellido ?? ""}
                  </p>
                  {p.cargo && <p className="text-sm text-ink/60 mt-0.5">{p.cargo}</p>}
                  {p.organizaciones && <p className="text-xs text-ink/50 mt-1">{p.organizaciones.nombre}</p>}
                  <span className="inline-block mt-3 text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-navy-50 text-navy/70">
                    {ESTADO_LABORAL_LABEL[p.estado_laboral]}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
