"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Select from "@/components/Select";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ViewTabBar from "@/components/dashboard/ViewTabBar";
import { ESTADO_LABORAL_LABEL, type PersonaLegajo } from "@/lib/rrhh/types";

type Agrupacion = "organizacion" | "alfabetico" | "ninguno";

const AGRUPACION_OPTIONS = [
  { value: "organizacion", label: "Agrupar por organización" },
  { value: "alfabetico", label: "Orden alfabético" },
  { value: "ninguno", label: "Sin agrupar" },
];

export default function PersonalListPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [personas, setPersonas] = useState<PersonaLegajo[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("organizacion");
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

  // Agrupa (o no) según el criterio elegido. Dentro de cada grupo las
  // personas quedan ordenadas alfabéticamente por nombre completo; los
  // grupos en sí también se ordenan alfabéticamente ("Sin organización"
  // siempre al final, para no mezclarlo con nombres reales).
  const grupos = useMemo(() => {
    const nombreCompleto = (p: PersonaLegajo) => `${p.nombre} ${p.apellido ?? ""}`.trim();

    if (agrupacion === "ninguno") {
      return [{ titulo: null as string | null, personas: filtered }];
    }

    if (agrupacion === "alfabetico") {
      const ordenadas = [...filtered].sort((a, b) =>
        nombreCompleto(a).localeCompare(nombreCompleto(b), "es")
      );
      return [{ titulo: null as string | null, personas: ordenadas }];
    }

    // agrupacion === "organizacion"
    const porOrg = new Map<string, PersonaLegajo[]>();
    for (const p of filtered) {
      const key = p.organizaciones?.nombre ?? "Sin organización";
      if (!porOrg.has(key)) porOrg.set(key, []);
      porOrg.get(key)!.push(p);
    }

    return [...porOrg.entries()]
      .sort(([a], [b]) => {
        if (a === "Sin organización") return 1;
        if (b === "Sin organización") return -1;
        return a.localeCompare(b, "es");
      })
      .map(([titulo, personasDelGrupo]) => ({
        titulo,
        personas: [...personasDelGrupo].sort((a, b) =>
          nombreCompleto(a).localeCompare(nombreCompleto(b), "es")
        ),
      }));
  }, [filtered, agrupacion]);

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
          title="Recursos Humanos"
          rightSlot={
            <>
              <Select
                options={AGRUPACION_OPTIONS}
                value={agrupacion}
                onChange={(e) => setAgrupacion(e.target.value as Agrupacion)}
                className="!py-2 !text-sm w-48 whitespace-nowrap"
              />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="!py-2 w-40 sm:w-48"
              />
            </>
          }
        />

        {loadingData ? (
          <p className="text-sm text-ink/40">Cargando...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <p className="text-sm text-ink/40">No hay colaboradores todavía.</p>
          </Card>
        ) : (
          <Card padded={false} className="overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/50 border-b border-navy-100">
                  <th className="px-5 py-3 font-medium">Nombre</th>
                  <th className="px-5 py-3 font-medium">Cargo</th>
                  <th className="px-5 py-3 font-medium">Organización</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {grupos.map((grupo, gi) => (
                  <Fragment key={grupo.titulo ?? `sin-grupo-${gi}`}>
                    {grupo.titulo && (
                      <tr className="bg-navy-50/60">
                        <td colSpan={4} className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-navy/60">
                          {grupo.titulo}{" "}
                          <span className="normal-case font-normal text-navy/40">
                            ({grupo.personas.length})
                          </span>
                        </td>
                      </tr>
                    )}
                    {grupo.personas.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => router.push(`/dashboard/personal/${p.id}`)}
                        className="cursor-pointer hover:bg-navy-50/40 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-navy">
                            {p.nombre} {p.apellido ?? ""}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-ink/70">{p.cargo ?? "—"}</td>
                        <td className="px-5 py-3 text-ink/70">{p.organizaciones?.nombre ?? "—"}</td>
                        <td className="px-5 py-3">
                          <span className="inline-block text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-navy-50 text-navy/70 whitespace-nowrap">
                            {ESTADO_LABORAL_LABEL[p.estado_laboral]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </main>
    </div>
  );
}
