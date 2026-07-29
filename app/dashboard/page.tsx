"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import { createClient } from "@/lib/supabase/client";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { dashboardItemsForRole, type Role } from "@/lib/roles";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("usuario");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
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
      .select("nombre, role")
      .eq("id", user.id)
      .maybeSingle();

    setNombre(profile?.nombre ?? null);
    setRole((profile?.role as Role) ?? "usuario");
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40">Cargando...</div>;
  }

  const items = dashboardItemsForRole(role);

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader />

      <main className="max-w-screen-2xl mx-auto px-5 sm:px-8 py-10 space-y-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-navy">
            Hola{nombre ? `, ${nombre}` : ""} 👋
          </h1>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) =>
            item.href ? (
              <Link key={item.key} href={item.href}>
                <Card className="h-full hover:shadow-soft hover:border-orange/40 transition-all cursor-pointer">
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <p className="font-display font-semibold text-navy mb-1">{item.titulo}</p>
                  <p className="text-sm text-ink/60">{item.descripcion}</p>
                </Card>
              </Link>
            ) : (
              <Card key={item.key} className="h-full opacity-60">
                <div className="text-2xl mb-3">{item.icon}</div>
                <p className="font-display font-semibold text-navy mb-1">{item.titulo}</p>
                <p className="text-sm text-ink/60 mb-3">{item.descripcion}</p>
                <span className="text-xs font-medium text-ink/40 bg-navy-50 rounded-full px-2.5 py-1">
                  Próximamente
                </span>
              </Card>
            )
          )}
        </div>
      </main>
    </div>
  );
}




