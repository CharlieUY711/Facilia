"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import { dashboardItemsForRole, ROLE_LABEL, type Role } from "@/lib/roles";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
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
    setEmail(user.email ?? "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("nombre, role")
      .eq("id", user.id)
      .maybeSingle();

    setNombre(profile?.nombre ?? null);
    setRole((profile?.role as Role) ?? "usuario");
    setLoading(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/panel/login");
    router.refresh();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40">Cargando...</div>;
  }

  const items = dashboardItemsForRole(role);

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-white border-b border-navy-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Image src="/FACILIA_By.png" alt="FACILIA" width={120} height={30} />
          <button onClick={handleLogout} className="text-sm text-ink/60 hover:text-navy transition-colors">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        <div className="mb-10">
          <p className="text-orange font-semibold text-sm uppercase tracking-wide mb-1">
            {ROLE_LABEL[role]}
          </p>
          <h1 className="font-display font-bold text-3xl text-navy">
            Hola{nombre ? `, ${nombre}` : ""} 👋
          </h1>
          <p className="text-ink/60 text-sm mt-1">{email}</p>
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




