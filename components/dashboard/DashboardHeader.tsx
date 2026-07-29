"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABEL, type Role } from "@/lib/roles";

// ── Iconos inline (sin dependencia externa) ───────────────────────

function IconUser({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M9 4.5H6a1.5 1.5 0 00-1.5 1.5v12A1.5 1.5 0 006 19.5h3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 16l4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.25 12H9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Navegación compartida entre las vistas de gestión ─────────────

export type DashboardNavKey = "cotizador" | "directorio" | "cotizaciones";

interface DashboardHeaderProps {
  title?: string;
  active?: DashboardNavKey;
  backHref?: string;
}

// Barra única: marca + rol + usuario. La barra de título/menú/volver fue eliminada.
export default function DashboardHeader({}: DashboardHeaderProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("nombre, role")
        .eq("id", user.id)
        .maybeSingle();
      setNombre(profile?.nombre ?? null);
      setRole((profile?.role as Role) ?? null);
    })();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/panel/login");
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-navy-100">
      {/* ── Barra: marca + rol + usuario ───────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Image src="/FACILIA_By.png" alt="FACILIA" width={138} height={35} />
        <div className="flex items-center gap-3">
          {role && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange/10 text-orange">
              {ROLE_LABEL[role]}
            </span>
          )}
          <div className="flex items-center gap-2 text-sm text-ink/70">
            <IconUser className="w-5 h-5 text-ink/40" />
            <span className="font-medium">{nombre || email || "—"}</span>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-ink/50 hover:text-navy hover:bg-navy-50 transition-colors"
          >
            <IconLogout className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
