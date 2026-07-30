"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Legajo from "@/components/rrhh/Legajo";

export default function LegajoAdminPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [checking, setChecking] = useState(true);

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
    })();
  }, [router]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40">Cargando...</div>;
  }

  return <Legajo personaId={params.id} mode="admin" />;
}
