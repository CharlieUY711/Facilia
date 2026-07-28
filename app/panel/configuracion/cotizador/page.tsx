"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Modal from "@/components/Modal";

type VariableTipo =
  | "TIPO_AMBIENTE"
  | "FRECUENCIA"
  | "PARAMETRO"
  | "EXTRA"
  | "OTRO_1"
  | "OTRO_2"; // ajustá a las 6 opciones reales del check

interface CotizadorVariable {
  id: string;
  nombre: string;
  codigo: string;
  tipo: VariableTipo;
  orden: number;
  obligatorio: boolean;
  afecta_precio: boolean;
  descripcion: string | null;
  activo: boolean;
}

interface CotizadorOpcion {
  id: string;
  variable_id: string;
  nombre: string;
  codigo: string;
  factor: number | null;
  precio_fijo: number | null;
  orden: number;
  activo: boolean;
}

interface CotizadorParametro {
  id: string;
  clave: string;
  descripcion: string;
  valor: number;
}

interface CotizadorExtra {
  id: string;
  nombre: string;
  codigo: string;
  tipo_calculo: "FACTOR" | "FIJO";
  valor: number;
  activo: boolean;
}

export default function CotizadorConfigPage() {
  const [variables, setVariables] = useState<CotizadorVariable[]>([]);
  const [opcionesPorVariable, setOpcionesPorVariable] = useState<Record<string, CotizadorOpcion[]>>({});
  const [parametros, setParametros] = useState<CotizadorParametro[]>([]);
  const [extras, setExtras] = useState<CotizadorExtra[]>([]);

  const [loadingVariables, setLoadingVariables] = useState(false);
  const [loadingParametros, setLoadingParametros] = useState(false);
  const [loadingExtras, setLoadingExtras] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal variable
  const [variableModalOpen, setVariableModalOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<CotizadorVariable | null>(null);
  const [variableForm, setVariableForm] = useState<Partial<CotizadorVariable>>({});

  // Modal opción
  const [opcionModalOpen, setOpcionModalOpen] = useState(false);
  const [editingOpcion, setEditingOpcion] = useState<CotizadorOpcion | null>(null);
  const [opcionForm, setOpcionForm] = useState<Partial<CotizadorOpcion>>({});
  const [opcionVariableId, setOpcionVariableId] = useState<string | null>(null);

  // Modal extra
  const [extraModalOpen, setExtraModalOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<CotizadorExtra | null>(null);
  const [extraForm, setExtraForm] = useState<Partial<CotizadorExtra>>({});

  function resetFeedback() {
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  // Fetch inicial
  useEffect(() => {
    fetchVariables();
    fetchParametros();
    fetchExtras();
  }, []);

  async function fetchVariables() {
    resetFeedback();
    setLoadingVariables(true);
    try {
      const res = await fetch("/api/cotizador/variables");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudieron cargar las variables");
      setVariables(data.variables);
      // Opciones por variable
      const map: Record<string, CotizadorOpcion[]> = {};
      for (const v of data.variables as CotizadorVariable[]) {
        const resOpt = await fetch(`/api/cotizador/opciones?variable_id=${v.id}`);
        const dataOpt = await resOpt.json();
        if (dataOpt.ok) {
          map[v.id] = dataOpt.opciones;
        } else {
          map[v.id] = [];
        }
      }
      setOpcionesPorVariable(map);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingVariables(false);
    }
  }

  async function fetchParametros() {
    resetFeedback();
    setLoadingParametros(true);
    try {
      const res = await fetch("/api/cotizador/config");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudieron cargar los parámetros");
      setParametros(data.parametros);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingParametros(false);
    }
  }

  async function fetchExtras() {
    resetFeedback();
    setLoadingExtras(true);
    try {
      const res = await fetch("/api/cotizador/extras");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudieron cargar los extras");
      setExtras(data.extras);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingExtras(false);
    }
  }

  // ───────────── VARIABLES ─────────────

  function openNewVariableModal() {
    resetFeedback();
    setEditingVariable(null);
    setVariableForm({
      nombre: "",
      codigo: "",
      tipo: "TIPO_AMBIENTE",
      orden: variables.length + 1,
      obligatorio: false,
      afecta_precio: true,
      descripcion: "",
      activo: true,
    });
    setVariableModalOpen(true);
  }

  function openEditVariableModal(variable: CotizadorVariable) {
    resetFeedback();
    setEditingVariable(variable);
    setVariableForm(variable);
    setVariableModalOpen(true);
  }

  async function saveVariable() {
    resetFeedback();
    try {
      const payload = {
        nombre: variableForm.nombre,
        codigo: variableForm.codigo,
        tipo: variableForm.tipo,
        orden: Number(variableForm.orden ?? 0),
        obligatorio: !!variableForm.obligatorio,
        afecta_precio: !!variableForm.afecta_precio,
        descripcion: variableForm.descripcion ?? "",
        activo: !!variableForm.activo,
      };
      const url = editingVariable
        ? `/api/cotizador/variables/${editingVariable.id}`
        : "/api/cotizador/variables";
      const method = editingVariable ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo guardar la variable");
      setSuccessMsg("Variable guardada correctamente.");
      setVariableModalOpen(false);
      await fetchVariables();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function toggleVariableActivo(variable: CotizadorVariable) {
    resetFeedback();
    try {
      const res = await fetch(`/api/cotizador/variables/${variable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !variable.activo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo actualizar la variable");
      setVariables((prev) =>
        prev.map((v) => (v.id === variable.id ? { ...v, activo: !v.activo } : v))
      );
      setSuccessMsg("Estado actualizado.");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // ───────────── OPCIONES ─────────────

  function openNewOpcionModal(variableId: string) {
    resetFeedback();
    setEditingOpcion(null);
    setOpcionVariableId(variableId);
    setOpcionForm({
      nombre: "",
      codigo: "",
      factor: 1,
      precio_fijo: null,
      orden: (opcionesPorVariable[variableId]?.length ?? 0) + 1,
      activo: true,
    });
    setOpcionModalOpen(true);
  }

  function openEditOpcionModal(variableId: string, opcion: CotizadorOpcion) {
    resetFeedback();
    setEditingOpcion(opcion);
    setOpcionVariableId(variableId);
    setOpcionForm(opcion);
    setOpcionModalOpen(true);
  }

  async function saveOpcion() {
    if (!opcionVariableId) return;
    resetFeedback();
    try {
      const payload = {
        variable_id: opcionVariableId,
        nombre: opcionForm.nombre,
        codigo: opcionForm.codigo,
        factor: opcionForm.factor !== null ? Number(opcionForm.factor) : null,
        precio_fijo: opcionForm.precio_fijo !== null ? Number(opcionForm.precio_fijo) : null,
        orden: Number(opcionForm.orden ?? 0),
        activo: !!opcionForm.activo,
      };
      const url = editingOpcion
        ? `/api/cotizador/opciones/${editingOpcion.id}`
        : "/api/cotizador/opciones";
      const method = editingOpcion ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo guardar la opción");
      setSuccessMsg("Opción guardada correctamente.");
      setOpcionModalOpen(false);
      await fetchVariables(); // recarga opciones también
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function softDeleteOpcion(opcion: CotizadorOpcion) {
    resetFeedback();
    try {
      const res = await fetch(`/api/cotizador/opciones/${opcion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: false }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo desactivar la opción");
      setOpcionesPorVariable((prev) => {
        const copy = { ...prev };
        const arr = copy[opcion.variable_id] ?? [];
        copy[opcion.variable_id] = arr.map((o) =>
          o.id === opcion.id ? { ...o, activo: false } : o
        );
        return copy;
      });
      setSuccessMsg("Opción desactivada.");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // ───────────── PARÁMETROS ─────────────

  function updateParametroLocal(id: string, valor: number) {
    setParametros((prev) => prev.map((p) => (p.id === id ? { ...p, valor } : p)));
  }

  async function saveParametros() {
    resetFeedback();
    try {
      const payload = parametros.map((p) => ({
        id: p.id,
        valor: p.valor,
      }));
      const res = await fetch("/api/cotizador/parametros", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parametros: payload }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudieron guardar los parámetros");
      setSuccessMsg("Parámetros guardados correctamente.");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // ───────────── EXTRAS ─────────────

  function openNewExtraModal() {
    resetFeedback();
    setEditingExtra(null);
    setExtraForm({
      nombre: "",
      codigo: "",
      tipo_calculo: "FACTOR",
      valor: 0,
      activo: true,
    });
    setExtraModalOpen(true);
  }

  function openEditExtraModal(extra: CotizadorExtra) {
    resetFeedback();
    setEditingExtra(extra);
    setExtraForm(extra);
    setExtraModalOpen(true);
  }

  async function saveExtra() {
    resetFeedback();
    try {
      const payload = {
        nombre: extraForm.nombre,
        codigo: extraForm.codigo,
        tipo_calculo: extraForm.tipo_calculo,
        valor: Number(extraForm.valor ?? 0),
        activo: !!extraForm.activo,
      };
      const url = editingExtra ? `/api/cotizador/extras/${editingExtra.id}` : "/api/cotizador/extras";
      const method = editingExtra ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo guardar el extra");
      setSuccessMsg("Extra guardado correctamente.");
      setExtraModalOpen(false);
      await fetchExtras();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function toggleExtraActivo(extra: CotizadorExtra) {
    resetFeedback();
    try {
      const res = await fetch(`/api/cotizador/extras/${extra.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !extra.activo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo actualizar el extra");
      setExtras((prev) =>
        prev.map((e) => (e.id === extra.id ? { ...e, activo: !e.activo } : e))
      );
      setSuccessMsg("Estado actualizado.");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // ───────────── RENDER ─────────────

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header igual al panel */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <Link
            href="/panel"
            className="text-sm text-ink/60 hover:text-ink flex items-center gap-1"
          >
            ← Volver al Dashboard
          </Link>
          <h1 className="font-display font-semibold text-2xl text-navy">
            Configuración del cotizador FACILIA
          </h1>
          <p className="text-sm text-ink/60">
            Administrá variables, opciones, parámetros y extras del motor de cotización.
          </p>
        </div>
        {/* Placeholder para Cerrar sesión si ya lo tenés en layout */}
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Sección Variables */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-navy">Variables</h2>
          <Button onClick={openNewVariableModal}>+ Nueva variable</Button>
        </div>

        <Card padded={false}>
          <table className="min-w-full text-sm">
            <thead className="bg-navy-50/50">
              <tr className="text-left text-xs uppercase tracking-wide text-navy/70">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Obligatoria</th>
                <th className="px-4 py-2">Afecta precio</th>
                <th className="px-4 py-2">Activo</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingVariables ? (
                <tr>
                  <td className="px-4 py-3 text-ink/50" colSpan={7}>
                    Cargando variables...
                  </td>
                </tr>
              ) : variables.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-ink/50" colSpan={7}>
                    No hay variables configuradas.
                  </td>
                </tr>
              ) : (
                variables.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t border-navy-100 hover:bg-navy-50/30 transition-colors"
                  >
                    <td className="px-4 py-2 align-top">
                      <div className="font-medium text-navy">{v.nombre}</div>
                      {v.descripcion && (
                        <div className="text-xs text-ink/60">{v.descripcion}</div>
                      )}
                      {/* Opciones embebidas */}
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-ink/60 mb-1">Opciones</p>
                        <div className="rounded-lg border border-navy-100 bg-paper">
                          <table className="w-full text-xs">
                            <thead className="bg-navy-50/40">
                              <tr>
                                <th className="px-2 py-1 text-left">Nombre</th>
                                <th className="px-2 py-1 text-left">Código</th>
                                <th className="px-2 py-1 text-right">Factor</th>
                                <th className="px-2 py-1 text-right">Precio fijo</th>
                                <th className="px-2 py-1 text-center">Activo</th>
                                <th className="px-2 py-1 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(opcionesPorVariable[v.id] ?? []).map((o) => (
                                <tr key={o.id} className="border-t border-navy-100/60">
                                  <td className="px-2 py-1">{o.nombre}</td>
                                  <td className="px-2 py-1">{o.codigo}</td>
                                  <td className="px-2 py-1 text-right">
                                    {o.factor ?? "—"}
                                  </td>
                                  <td className="px-2 py-1 text-right">
                                    {o.precio_fijo ?? "—"}
                                  </td>
                                  <td className="px-2 py-1 text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        softDeleteOpcion(o) /* o toggle activo si preferís */
                                      }
                                      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] ${
                                        o.activo
                                          ? "bg-green-100 text-green-700"
                                          : "bg-ink/10 text-ink/50"
                                      }`}
                                    >
                                      {o.activo ? "Activo" : "Inactivo"}
                                    </button>
                                  </td>
                                  <td className="px-2 py-1 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditOpcionModal(v.id, o)}
                                    >
                                      Editar
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td className="px-2 py-1 text-xs text-blue" colSpan={6}>
                                  <button
                                    type="button"
                                    className="hover:underline"
                                    onClick={() => openNewOpcionModal(v.id)}
                                  >
                                    + Agregar opción
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 align-top text-sm text-ink/80">{v.codigo}</td>
                    <td className="px-4 py-2 align-top text-sm text-ink/80">{v.tipo}</td>
                    <td className="px-4 py-2 align-top text-sm text-ink/80">
                      {v.obligatorio ? "Sí" : "No"}
                    </td>
                    <td className="px-4 py-2 align-top text-sm text-ink/80">
                      {v.afecta_precio ? "Sí" : "No"}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => toggleVariableActivo(v)}
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs ${
                          v.activo
                            ? "bg-green-100 text-green-700"
                            : "bg-ink/10 text-ink/50"
                        }`}
                      >
                        {v.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-2 align-top text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditVariableModal(v)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Sección Parámetros */}
      <section className="space-y-4">
        <h2 className="font-display font-semibold text-lg text-navy">Parámetros</h2>
        <Card>
          {loadingParametros ? (
            <p className="text-sm text-ink/50">Cargando parámetros...</p>
          ) : parametros.length === 0 ? (
            <p className="text-sm text-ink/50">No hay parámetros configurados.</p>
          ) : (
            <div className="space-y-3">
              {parametros.map((p) => (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_160px] gap-3 items-center">
                  <div>
                    <p className="text-sm font-medium text-navy">{p.descripcion}</p>
                    <p className="text-xs text-ink/50">{p.clave}</p>
                  </div>
                  <Input
                    type="number"
                    value={p.valor}
                    onChange={(e) => updateParametroLocal(p.id, Number(e.target.value))}
                  />
                </div>
              ))}
              <div className="pt-2 flex justify-end">
                <Button onClick={saveParametros}>Guardar cambios</Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Sección Extras */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-navy">Extras</h2>
          <Button onClick={openNewExtraModal}>+ Nuevo extra</Button>
        </div>
        <Card padded={false}>
          <table className="min-w-full text-sm">
            <thead className="bg-navy-50/50">
              <tr className="text-left text-xs uppercase tracking-wide text-navy/70">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Tipo de cálculo</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2">Activo</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingExtras ? (
                <tr>
                  <td className="px-4 py-3 text-ink/50" colSpan={6}>
                    Cargando extras...
                  </td>
                </tr>
              ) : extras.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-ink/50" colSpan={6}>
                    No hay extras configurados.
                  </td>
                </tr>
              ) : (
                extras.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-navy-100 hover:bg-navy-50/30 transition-colors"
                  >
                    <td className="px-4 py-2">{e.nombre}</td>
                    <td className="px-4 py-2">{e.codigo}</td>
                    <td className="px-4 py-2">{e.tipo_calculo}</td>
                    <td className="px-4 py-2">{e.valor}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => toggleExtraActivo(e)}
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs ${
                          e.activo
                            ? "bg-green-100 text-green-700"
                            : "bg-ink/10 text-ink/50"
                        }`}
                      >
                        {e.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditExtraModal(e)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Modal Variable */}
      <Modal open={variableModalOpen} onClose={() => setVariableModalOpen(false)} title={editingVariable ? "Editar variable" : "Nueva variable"}>
        <div className="space-y-3">
          <Input
            label="Nombre"
            value={variableForm.nombre ?? ""}
            onChange={(e) => setVariableForm((f) => ({ ...f, nombre: e.target.value }))}
          />
          <Input
            label="Código"
            value={variableForm.codigo ?? ""}
            onChange={(e) => setVariableForm((f) => ({ ...f, codigo: e.target.value }))}
          />
          <Select
            label="Tipo"
            value={variableForm.tipo ?? "TIPO_AMBIENTE"}
            onChange={(e) =>
              setVariableForm((f) => ({ ...f, tipo: e.target.value as VariableTipo }))
            }
            options={[
              { value: "TIPO_AMBIENTE", label: "Tipo de ambiente" },
              { value: "FRECUENCIA", label: "Frecuencia" },
              { value: "PARAMETRO", label: "Parámetro" },
              { value: "EXTRA", label: "Extra" },
              { value: "OTRO_1", label: "Otro 1" },
              { value: "OTRO_2", label: "Otro 2" },
            ]}
          />
          <Input
            label="Orden"
            type="number"
            value={variableForm.orden ?? 0}
            onChange={(e) =>
              setVariableForm((f) => ({ ...f, orden: Number(e.target.value) }))
            }
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={!!variableForm.obligatorio}
                onChange={(e) =>
                  setVariableForm((f) => ({ ...f, obligatorio: e.target.checked }))
                }
              />
              Obligatoria
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={!!variableForm.afecta_precio}
                onChange={(e) =>
                  setVariableForm((f) => ({ ...f, afecta_precio: e.target.checked }))
                }
              />
              Afecta precio
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={!!variableForm.activo}
                onChange={(e) =>
                  setVariableForm((f) => ({ ...f, activo: e.target.checked }))
                }
              />
              Activa
            </label>
          </div>
          <Input
            label="Descripción"
            value={variableForm.descripcion ?? ""}
            onChange={(e) =>
              setVariableForm((f) => ({ ...f, descripcion: e.target.value }))
            }
          />
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setVariableModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveVariable}>
              {editingVariable ? "Guardar cambios" : "Crear variable"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Opción */}
      <Modal
        open={opcionModalOpen}
        onClose={() => setOpcionModalOpen(false)}
        title={editingOpcion ? "Editar opción" : "Nueva opción"}
      >
        <div className="space-y-3">
          <Input
            label="Nombre"
            value={opcionForm.nombre ?? ""}
            onChange={(e) => setOpcionForm((f) => ({ ...f, nombre: e.target.value }))}
          />
          <Input
            label="Código"
            value={opcionForm.codigo ?? ""}
            onChange={(e) => setOpcionForm((f) => ({ ...f, codigo: e.target.value }))}
          />
          <Input
            label="Factor"
            type="number"
            value={opcionForm.factor ?? 1}
            onChange={(e) =>
              setOpcionForm((f) => ({ ...f, factor: Number(e.target.value) }))
            }
          />
          <Input
            label="Precio fijo"
            type="number"
            value={opcionForm.precio_fijo ?? ""}
            onChange={(e) =>
              setOpcionForm((f) => ({
                ...f,
                precio_fijo: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
          <Input
            label="Orden"
            type="number"
            value={opcionForm.orden ?? 0}
            onChange={(e) =>
              setOpcionForm((f) => ({ ...f, orden: Number(e.target.value) }))
            }
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={!!opcionForm.activo}
              onChange={(e) =>
                setOpcionForm((f) => ({ ...f, activo: e.target.checked }))
              }
            />
            Activa
          </label>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpcionModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveOpcion}>
              {editingOpcion ? "Guardar cambios" : "Crear opción"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Extra */}
      <Modal
        open={extraModalOpen}
        onClose={() => setExtraModalOpen(false)}
        title={editingExtra ? "Editar extra" : "Nuevo extra"}
      >
        <div className="space-y-3">
          <Input
            label="Nombre"
            value={extraForm.nombre ?? ""}
            onChange={(e) => setExtraForm((f) => ({ ...f, nombre: e.target.value }))}
          />
          <Input
            label="Código"
            value={extraForm.codigo ?? ""}
            onChange={(e) => setExtraForm((f) => ({ ...f, codigo: e.target.value }))}
          />
          <Select
            label="Tipo de cálculo"
            value={extraForm.tipo_calculo ?? "FACTOR"}
            onChange={(e) =>
              setExtraForm((f) => ({
                ...f,
                tipo_calculo: e.target.value as CotizadorExtra["tipo_calculo"],
              }))
            }
            options={[
              { value: "FACTOR", label: "Factor" },
              { value: "FIJO", label: "Precio fijo" },
            ]}
          />
          <Input
            label="Valor"
            type="number"
            value={extraForm.valor ?? 0}
            onChange={(e) =>
              setExtraForm((f) => ({ ...f, valor: Number(e.target.value) }))
            }
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={!!extraForm.activo}
              onChange={(e) =>
                setExtraForm((f) => ({ ...f, activo: e.target.checked }))
              }
            />
            Activo
          </label>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setExtraModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveExtra}>
              {editingExtra ? "Guardar cambios" : "Crear extra"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
