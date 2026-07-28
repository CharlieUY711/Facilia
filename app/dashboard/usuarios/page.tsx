"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Combobox from "@/components/Combobox";
import Textarea from "@/components/Textarea";
import Modal from "@/components/Modal";
import { ROLE_LABEL, type Role } from "@/lib/roles";

// ── Tipos ──────────────────────────────────────────────────────────

type TipoPersona = "cliente" | "personal_facilia" | "proveedor" | "otro";
type TipoOrganizacion = "cliente" | "proveedor" | "interna" | "otro";

interface RefMini {
  id: string;
  nombre: string;
}

interface Persona {
  id: string;
  profile_id: string | null;
  organizacion_id: string | null;
  locacion_id: string | null;
  nombre: string;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  cargo: string | null;
  tipo: TipoPersona;
  pending_role: Role | null;
  notas: string | null;
  created_at: string;
  organizaciones: RefMini | null;
  locaciones: RefMini | null;
  profiles: { id: string; role: Role; email: string } | null;
}

interface Organizacion {
  id: string;
  nombre: string;
  tipo: TipoOrganizacion;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  sitio_web: string | null;
  direccion: string | null;
  ciudad: string | null;
  notas: string | null;
  created_at: string;
}

interface Locacion {
  id: string;
  organizacion_id: string | null;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  tipo_espacio: string | null;
  referencia: string | null;
  notas: string | null;
  created_at: string;
  organizaciones: RefMini | null;
}

const TIPO_PERSONA_LABEL: Record<TipoPersona, string> = {
  cliente: "Cliente",
  personal_facilia: "Personal FACILIA",
  proveedor: "Proveedor",
  otro: "Otro",
};

const TIPO_ORG_LABEL: Record<TipoOrganizacion, string> = {
  cliente: "Cliente",
  proveedor: "Proveedor",
  interna: "Interna (FACILIA)",
  otro: "Otro",
};

const TIPO_PERSONA_OPTIONS = (Object.keys(TIPO_PERSONA_LABEL) as TipoPersona[]).map((v) => ({
  value: v,
  label: TIPO_PERSONA_LABEL[v],
}));
const TIPO_ORG_OPTIONS = (Object.keys(TIPO_ORG_LABEL) as TipoOrganizacion[]).map((v) => ({
  value: v,
  label: TIPO_ORG_LABEL[v],
}));
const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as Role[]).map((v) => ({
  value: v,
  label: ROLE_LABEL[v],
}));

type Tab = "personas" | "organizaciones" | "locaciones";

// ── Página ─────────────────────────────────────────────────────────

export default function DirectorioPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [tab, setTab] = useState<Tab>("personas");
  const [error, setError] = useState<string | null>(null);

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [locaciones, setLocaciones] = useState<Locacion[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");

  const [personaModal, setPersonaModal] = useState<{ open: boolean; editing: Persona | null }>({
    open: false,
    editing: null,
  });
  const [orgModal, setOrgModal] = useState<{ open: boolean; editing: Organizacion | null }>({
    open: false,
    editing: null,
  });
  const [locModal, setLocModal] = useState<{ open: boolean; editing: Locacion | null }>({
    open: false,
    editing: null,
  });

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

    setCurrentUserId(user.id);
    setCurrentRole(profile.role as Role);
    setChecking(false);
    await loadAll();
  }

  async function loadAll() {
    setLoadingData(true);
    const [rp, ro, rl] = await Promise.all([
      fetch("/api/personas").then((r) => r.json()),
      fetch("/api/organizaciones").then((r) => r.json()),
      fetch("/api/locaciones").then((r) => r.json()),
    ]);
    if (rp.ok) setPersonas(rp.personas);
    if (ro.ok) setOrganizaciones(ro.organizaciones);
    if (rl.ok) setLocaciones(rl.locaciones);
    setLoadingData(false);
  }

  // Cuando se crea una organización "al vuelo" desde el formulario de
  // Persona o Locación (sin cerrar ese formulario), la sumamos a la
  // lista local para que aparezca al instante en el combo.
  function handleOrganizacionCreada(org: Organizacion) {
    setOrganizaciones((prev) => [...prev, org].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }

  const filteredPersonas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return personas;
    return personas.filter((p) =>
      [p.nombre, p.apellido, p.email, p.direccion, p.cargo, p.organizaciones?.nombre]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [personas, search]);

  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizaciones;
    return organizaciones.filter((o) =>
      [o.nombre, o.rut, o.email, o.ciudad, o.sitio_web].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [organizaciones, search]);

  const filteredLocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locaciones;
    return locaciones.filter((l) =>
      [l.nombre, l.direccion, l.ciudad, l.organizaciones?.nombre].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [locaciones, search]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-white border-b border-navy-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Image src="/FACILIA_By.png" alt="FACILIA" width={120} height={30} />
          <Link href="/dashboard" className="text-sm text-blue hover:underline">
            ← Volver al dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 space-y-6">
        <div>
          <p className="text-orange font-semibold text-sm uppercase tracking-wide mb-1">
            {currentRole === "super_admin" ? "Super Admin" : "Administrador"}
          </p>
          <h1 className="font-display font-bold text-2xl text-navy">Directorio</h1>
          <p className="text-ink/60 text-sm mt-1">
            Organizaciones, personas y locaciones. Gestioná accesos y roles de clientes y equipo FACILIA.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              ×
            </button>
          </p>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-navy-100 rounded-xl p-1 w-fit">
          {(
            [
              ["personas", "Personas", personas.length],
              ["organizaciones", "Organizaciones", organizaciones.length],
              ["locaciones", "Locaciones", locaciones.length],
            ] as [Tab, string, number][]
          ).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? "bg-navy text-white" : "text-ink/60 hover:text-navy"
              }`}
            >
              {label} <span className="opacity-60">({count})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          {tab === "personas" && (
            <Button onClick={() => setPersonaModal({ open: true, editing: null })}>+ Nueva persona</Button>
          )}
          {tab === "organizaciones" && (
            <Button onClick={() => setOrgModal({ open: true, editing: null })}>+ Nueva organización</Button>
          )}
          {tab === "locaciones" && (
            <Button onClick={() => setLocModal({ open: true, editing: null })}>+ Nueva locación</Button>
          )}
        </div>

        {loadingData ? (
          <p className="text-sm text-ink/40">Cargando...</p>
        ) : (
          <>
            {tab === "personas" && (
              <PersonasTable
                personas={filteredPersonas}
                currentUserId={currentUserId}
                currentRole={currentRole}
                onEdit={(p) => setPersonaModal({ open: true, editing: p })}
                onReload={loadAll}
                onError={setError}
              />
            )}
            {tab === "organizaciones" && (
              <OrganizacionesTable
                organizaciones={filteredOrgs}
                onEdit={(o) => setOrgModal({ open: true, editing: o })}
                onReload={loadAll}
                onError={setError}
              />
            )}
            {tab === "locaciones" && (
              <LocacionesTable
                locaciones={filteredLocs}
                onEdit={(l) => setLocModal({ open: true, editing: l })}
                onReload={loadAll}
                onError={setError}
              />
            )}
          </>
        )}
      </main>

      <PersonaFormModal
        open={personaModal.open}
        editing={personaModal.editing}
        organizaciones={organizaciones}
        currentRole={currentRole}
        onClose={() => setPersonaModal({ open: false, editing: null })}
        onSaved={loadAll}
        onError={setError}
        onOrganizacionCreada={handleOrganizacionCreada}
      />
      <OrganizacionFormModal
        open={orgModal.open}
        editing={orgModal.editing}
        onClose={() => setOrgModal({ open: false, editing: null })}
        onSaved={loadAll}
        onError={setError}
      />
      <LocacionFormModal
        open={locModal.open}
        editing={locModal.editing}
        organizaciones={organizaciones}
        onClose={() => setLocModal({ open: false, editing: null })}
        onSaved={loadAll}
        onError={setError}
        onOrganizacionCreada={handleOrganizacionCreada}
      />
    </div>
  );
}

// ── Tabla: Personas ───────────────────────────────────────────────

function PersonasTable({
  personas,
  currentUserId,
  currentRole,
  onEdit,
  onReload,
  onError,
}: {
  personas: Persona[];
  currentUserId: string | null;
  currentRole: Role | null;
  onEdit: (p: Persona) => void;
  onReload: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function invitar(p: Persona) {
    if (!p.email) {
      onError("Cargale un email antes de invitarla.");
      return;
    }
    setBusyId(p.id);
    onError(null);
    const res = await fetch(`/api/personas/${p.id}/invitar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: p.pending_role || "usuario" }),
    });
    const data = await res.json();
    if (data.ok) await onReload();
    else onError(data.error ?? "No se pudo invitar.");
    setBusyId(null);
  }

  async function revocar(p: Persona) {
    if (!confirm(`¿Revocar el acceso de ${p.nombre}? Ya no va a poder iniciar sesión.`)) return;
    setBusyId(p.id);
    onError(null);
    const res = await fetch(`/api/personas/${p.id}/revocar`, { method: "POST" });
    const data = await res.json();
    if (data.ok) await onReload();
    else onError(data.error ?? "No se pudo revocar el acceso.");
    setBusyId(null);
  }

  async function eliminar(p: Persona) {
    if (!confirm(`¿Eliminar a ${p.nombre} del directorio?`)) return;
    setBusyId(p.id);
    onError(null);
    const res = await fetch(`/api/personas/${p.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) await onReload();
    else onError(data.error ?? "No se pudo eliminar.");
    setBusyId(null);
  }

  async function cambiarRol(p: Persona, role: string) {
    setBusyId(p.id);
    onError(null);
    const res = await fetch(`/api/personas/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (data.ok) await onReload();
    else onError(data.error ?? "No se pudo cambiar el rol.");
    setBusyId(null);
  }

  return (
    <Card padded={false} className="overflow-hidden overflow-x-auto">
      {personas.length === 0 ? (
        <p className="p-6 text-sm text-ink/40">No hay personas todavía.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/50 border-b border-navy-100">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Organización</th>
              <th className="px-5 py-3 font-medium">Contacto</th>
              <th className="px-5 py-3 font-medium">Acceso</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {personas.map((p) => {
              const disabled = busyId === p.id;
              const puedeAsignarSuperAdmin = currentRole === "super_admin";
              const rolBloqueado =
                p.profiles?.role === "super_admin" && currentRole !== "super_admin";
              return (
                <tr key={p.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-navy">
                      {p.nombre} {p.apellido ?? ""}
                    </p>
                    {p.cargo && <p className="text-xs text-ink/50">{p.cargo}</p>}
                    {p.profile_id === currentUserId && (
                      <span className="text-xs text-orange font-semibold">(vos)</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink/70">{TIPO_PERSONA_LABEL[p.tipo]}</td>
                  <td className="px-5 py-3 text-ink/70">{p.organizaciones?.nombre ?? "—"}</td>
                  <td className="px-5 py-3 text-ink/70">
                    {p.email && <p>{p.email}</p>}
                    {p.telefono && <p className="text-xs text-ink/50">{p.telefono}</p>}
                    {p.direccion && <p className="text-xs text-ink/50">{p.direccion}</p>}
                  </td>
                  <td className="px-5 py-3">
                    {p.profile_id ? (
                      <Select
                        options={ROLE_OPTIONS.filter(
                          (o) => o.value !== "super_admin" || puedeAsignarSuperAdmin || p.profiles?.role === "super_admin"
                        )}
                        value={p.profiles?.role}
                        disabled={disabled || rolBloqueado}
                        onChange={(e) => cambiarRol(p, e.target.value)}
                        className="!py-1.5 !text-sm max-w-[170px]"
                      />
                    ) : (
                      <span className="text-xs font-medium text-ink/40 bg-navy-50 rounded-full px-2.5 py-1">
                        Sin acceso
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {!p.profile_id ? (
                        <Button size="sm" variant="ghost" disabled={disabled} onClick={() => invitar(p)}>
                          Invitar acceso
                        </Button>
                      ) : (
                        p.profile_id !== currentUserId &&
                        !rolBloqueado && (
                          <Button size="sm" variant="ghost" disabled={disabled} onClick={() => revocar(p)}>
                            Revocar acceso
                          </Button>
                        )
                      )}
                      <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onEdit(p)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="danger" disabled={disabled} onClick={() => eliminar(p)}>
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// ── Tabla: Organizaciones ─────────────────────────────────────────

function OrganizacionesTable({
  organizaciones,
  onEdit,
  onReload,
  onError,
}: {
  organizaciones: Organizacion[];
  onEdit: (o: Organizacion) => void;
  onReload: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function eliminar(o: Organizacion) {
    if (!confirm(`¿Eliminar "${o.nombre}"? Las personas y locaciones vinculadas quedan sin organización.`))
      return;
    setBusyId(o.id);
    onError(null);
    const res = await fetch(`/api/organizaciones/${o.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) await onReload();
    else onError(data.error ?? "No se pudo eliminar.");
    setBusyId(null);
  }

  return (
    <Card padded={false} className="overflow-hidden overflow-x-auto">
      {organizaciones.length === 0 ? (
        <p className="p-6 text-sm text-ink/40">No hay organizaciones todavía.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/50 border-b border-navy-100">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">RUT</th>
              <th className="px-5 py-3 font-medium">Contacto</th>
              <th className="px-5 py-3 font-medium">Dirección</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {organizaciones.map((o) => (
              <tr key={o.id}>
                <td className="px-5 py-3 font-medium text-navy">{o.nombre}</td>
                <td className="px-5 py-3 text-ink/70">{TIPO_ORG_LABEL[o.tipo]}</td>
                <td className="px-5 py-3 text-ink/70">{o.rut ?? "—"}</td>
                <td className="px-5 py-3 text-ink/70">
                  {o.email && <p>{o.email}</p>}
                  {o.telefono && <p className="text-xs text-ink/50">{o.telefono}</p>}
                </td>
                <td className="px-5 py-3 text-ink/70">
                  {o.direccion && <p>{o.direccion}</p>}
                  {o.ciudad && <p className="text-xs text-ink/50">{o.ciudad}</p>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" disabled={busyId === o.id} onClick={() => onEdit(o)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="danger" disabled={busyId === o.id} onClick={() => eliminar(o)}>
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// ── Tabla: Locaciones ──────────────────────────────────────────────

function LocacionesTable({
  locaciones,
  onEdit,
  onReload,
  onError,
}: {
  locaciones: Locacion[];
  onEdit: (l: Locacion) => void;
  onReload: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function eliminar(l: Locacion) {
    if (!confirm(`¿Eliminar "${l.nombre}"? Las personas vinculadas quedan sin locación.`)) return;
    setBusyId(l.id);
    onError(null);
    const res = await fetch(`/api/locaciones/${l.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) await onReload();
    else onError(data.error ?? "No se pudo eliminar.");
    setBusyId(null);
  }

  return (
    <Card padded={false} className="overflow-hidden overflow-x-auto">
      {locaciones.length === 0 ? (
        <p className="p-6 text-sm text-ink/40">No hay locaciones todavía.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/50 border-b border-navy-100">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Organización</th>
              <th className="px-5 py-3 font-medium">Dirección</th>
              <th className="px-5 py-3 font-medium">Ciudad</th>
              <th className="px-5 py-3 font-medium">Tipo de espacio</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {locaciones.map((l) => (
              <tr key={l.id}>
                <td className="px-5 py-3 font-medium text-navy">{l.nombre}</td>
                <td className="px-5 py-3 text-ink/70">{l.organizaciones?.nombre ?? "—"}</td>
                <td className="px-5 py-3 text-ink/70">{l.direccion ?? "—"}</td>
                <td className="px-5 py-3 text-ink/70">{l.ciudad ?? "—"}</td>
                <td className="px-5 py-3 text-ink/70">{l.tipo_espacio ?? "—"}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" disabled={busyId === l.id} onClick={() => onEdit(l)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="danger" disabled={busyId === l.id} onClick={() => eliminar(l)}>
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// ── Modal: Persona ─────────────────────────────────────────────────

function PersonaFormModal({
  open,
  editing,
  organizaciones,
  currentRole,
  onClose,
  onSaved,
  onError,
  onOrganizacionCreada,
}: {
  open: boolean;
  editing: Persona | null;
  organizaciones: Organizacion[];
  currentRole: Role | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string | null) => void;
  onOrganizacionCreada: (org: Organizacion) => void;
}) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    direccion: "",
    organizacion_id: "",
    cargo: "",
    tipo: "cliente" as TipoPersona,
    notas: "",
    pending_role: "usuario" as Role,
  });
  const [saving, setSaving] = useState(false);

  // Alta rápida de organización sin salir del formulario de la persona:
  // si al buscar no aparece en la lista, se crea acá y seguimos cargando
  // el resto de los datos de la persona.
  const [nuevaOrgModal, setNuevaOrgModal] = useState<{ open: boolean; nombreInicial: string }>({
    open: false,
    nombreInicial: "",
  });

  useEffect(() => {
    if (editing) {
      setForm({
        nombre: editing.nombre,
        apellido: editing.apellido ?? "",
        email: editing.email ?? "",
        telefono: editing.telefono ?? "",
        direccion: editing.direccion ?? "",
        organizacion_id: editing.organizacion_id ?? "",
        cargo: editing.cargo ?? "",
        tipo: editing.tipo,
        notas: editing.notas ?? "",
        pending_role: editing.pending_role ?? "usuario",
      });
    } else {
      setForm({
        nombre: "",
        apellido: "",
        email: "",
        telefono: "",
        direccion: "",
        organizacion_id: "",
        cargo: "",
        tipo: "cliente",
        notas: "",
        pending_role: "usuario",
      });
    }
  }, [editing, open]);

  async function submit() {
    if (!form.nombre.trim()) {
      onError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    onError(null);

    const payload: Record<string, unknown> = {
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
      telefono: form.telefono,
      direccion: form.direccion,
      organizacion_id: form.organizacion_id || null,
      cargo: form.cargo,
      tipo: form.tipo,
      notas: form.notas,
    };
    if (!editing) payload.pending_role = form.pending_role;

    const res = await fetch(editing ? `/api/personas/${editing.id}` : "/api/personas", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      onClose();
      await onSaved();
    } else {
      onError(data.error ?? "No se pudo guardar.");
    }
  }

  const rolOptions = ROLE_OPTIONS.filter((o) => o.value !== "super_admin" || currentRole === "super_admin");

  return (
    <>
      <Modal open={open} onClose={onClose} title={editing ? "Editar persona" : "Nueva persona"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            <Input
              label="Apellido"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
          <Input
            label="Dirección"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Combobox
              label="Organización"
              placeholder="Buscar organización..."
              clearLabel="— Sin organización —"
              options={organizaciones.map((o) => ({ value: o.id, label: o.nombre, sublabel: TIPO_ORG_LABEL[o.tipo] }))}
              value={form.organizacion_id}
              onChange={(v) => setForm({ ...form, organizacion_id: v })}
              onCreateNew={(query) => setNuevaOrgModal({ open: true, nombreInicial: query })}
              createLabel="Cargar organización"
            />
            <Input
              label="Cargo"
              value={form.cargo}
              onChange={(e) => setForm({ ...form, cargo: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Combobox
              label="Tipo de contacto"
              options={TIPO_PERSONA_OPTIONS}
              value={form.tipo}
              onChange={(v) => setForm({ ...form, tipo: v as TipoPersona })}
            />
            {!editing && (
              <Combobox
                label="Rol al invitarla"
                options={rolOptions}
                value={form.pending_role}
                onChange={(v) => setForm({ ...form, pending_role: v as Role })}
              />
            )}
          </div>

          <Textarea
            label="Notas"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} loading={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Alta rápida de organización, sin perder lo cargado de la persona */}
      <OrganizacionFormModal
        open={nuevaOrgModal.open}
        editing={null}
        nombreInicial={nuevaOrgModal.nombreInicial}
        onClose={() => setNuevaOrgModal({ open: false, nombreInicial: "" })}
        onSaved={async () => {}}
        onError={onError}
        onCreated={(org) => {
          onOrganizacionCreada(org);
          setForm((f) => ({ ...f, organizacion_id: org.id }));
        }}
      />
    </>
  );
}

// ── Modal: Organización ────────────────────────────────────────────

function OrganizacionFormModal({
  open,
  editing,
  nombreInicial,
  onClose,
  onSaved,
  onError,
  onCreated,
}: {
  open: boolean;
  editing: Organizacion | null;
  /** Prefill del nombre cuando se abre como alta rápida desde otro formulario. */
  nombreInicial?: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string | null) => void;
  /** Se dispara al crear (no al editar) — usado por el alta rápida embebida. */
  onCreated?: (org: Organizacion) => void;
}) {
  const [form, setForm] = useState({
    nombre: "",
    tipo: "cliente" as TipoOrganizacion,
    rut: "",
    email: "",
    telefono: "",
    sitio_web: "",
    direccion: "",
    ciudad: "",
    notas: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        nombre: editing.nombre,
        tipo: editing.tipo,
        rut: editing.rut ?? "",
        email: editing.email ?? "",
        telefono: editing.telefono ?? "",
        sitio_web: editing.sitio_web ?? "",
        direccion: editing.direccion ?? "",
        ciudad: editing.ciudad ?? "",
        notas: editing.notas ?? "",
      });
    } else {
      setForm({
        nombre: nombreInicial ?? "",
        tipo: "cliente",
        rut: "",
        email: "",
        telefono: "",
        sitio_web: "",
        direccion: "",
        ciudad: "",
        notas: "",
      });
    }
  }, [editing, open, nombreInicial]);

  async function submit() {
    if (!form.nombre.trim()) {
      onError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    onError(null);
    const res = await fetch(editing ? `/api/organizaciones/${editing.id}` : "/api/organizaciones", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      onClose();
      if (!editing && onCreated) onCreated(data.organizacion);
      await onSaved();
    } else {
      onError(data.error ?? "No se pudo guardar.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar organización" : "Nueva organización"}>
      <div className="space-y-4">
        <Input
          label="Nombre"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Combobox
            label="Tipo"
            options={TIPO_ORG_OPTIONS}
            value={form.tipo}
            onChange={(v) => setForm({ ...form, tipo: v as TipoOrganizacion })}
          />
          <Input label="RUT" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </div>
        <Input
          label="Sitio web"
          value={form.sitio_web}
          onChange={(e) => setForm({ ...form, sitio_web: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Dirección"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />
          <Input
            label="Ciudad"
            value={form.ciudad}
            onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
          />
        </div>
        <Textarea
          label="Notas"
          value={form.notas}
          onChange={(e) => setForm({ ...form, notas: e.target.value })}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: Locación ─────────────────────────────────────────────────

function LocacionFormModal({
  open,
  editing,
  organizaciones,
  onClose,
  onSaved,
  onError,
  onOrganizacionCreada,
}: {
  open: boolean;
  editing: Locacion | null;
  organizaciones: Organizacion[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string | null) => void;
  onOrganizacionCreada: (org: Organizacion) => void;
}) {
  const [form, setForm] = useState({
    nombre: "",
    organizacion_id: "",
    direccion: "",
    ciudad: "",
    tipo_espacio: "",
    referencia: "",
    notas: "",
  });
  const [saving, setSaving] = useState(false);
  const [nuevaOrgModal, setNuevaOrgModal] = useState<{ open: boolean; nombreInicial: string }>({
    open: false,
    nombreInicial: "",
  });

  useEffect(() => {
    if (editing) {
      setForm({
        nombre: editing.nombre,
        organizacion_id: editing.organizacion_id ?? "",
        direccion: editing.direccion ?? "",
        ciudad: editing.ciudad ?? "",
        tipo_espacio: editing.tipo_espacio ?? "",
        referencia: editing.referencia ?? "",
        notas: editing.notas ?? "",
      });
    } else {
      setForm({
        nombre: "",
        organizacion_id: "",
        direccion: "",
        ciudad: "",
        tipo_espacio: "",
        referencia: "",
        notas: "",
      });
    }
  }, [editing, open]);

  async function submit() {
    if (!form.nombre.trim()) {
      onError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    onError(null);
    const payload = { ...form, organizacion_id: form.organizacion_id || null };
    const res = await fetch(editing ? `/api/locaciones/${editing.id}` : "/api/locaciones", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      onClose();
      await onSaved();
    } else {
      onError(data.error ?? "No se pudo guardar.");
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={editing ? "Editar locación" : "Nueva locación"}>
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <Combobox
            label="Organización"
            placeholder="Buscar organización... (opcional)"
            clearLabel="— Sin organización —"
            options={organizaciones.map((o) => ({ value: o.id, label: o.nombre, sublabel: TIPO_ORG_LABEL[o.tipo] }))}
            value={form.organizacion_id}
            onChange={(v) => setForm({ ...form, organizacion_id: v })}
            onCreateNew={(query) => setNuevaOrgModal({ open: true, nombreInicial: query })}
            createLabel="Cargar organización"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Dirección"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
            <Input
              label="Ciudad"
              value={form.ciudad}
              onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tipo de espacio"
              placeholder="Ej: oficina, depósito, planta"
              value={form.tipo_espacio}
              onChange={(e) => setForm({ ...form, tipo_espacio: e.target.value })}
            />
            <Input
              label="Referencia / acceso"
              placeholder="Ej: portón azul, piso 3"
              value={form.referencia}
              onChange={(e) => setForm({ ...form, referencia: e.target.value })}
            />
          </div>
          <Textarea
            label="Notas"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} loading={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      <OrganizacionFormModal
        open={nuevaOrgModal.open}
        editing={null}
        nombreInicial={nuevaOrgModal.nombreInicial}
        onClose={() => setNuevaOrgModal({ open: false, nombreInicial: "" })}
        onSaved={async () => {}}
        onError={onError}
        onCreated={(org) => {
          onOrganizacionCreada(org);
          setForm((f) => ({ ...f, organizacion_id: org.id }));
        }}
      />
    </>
  );
}
