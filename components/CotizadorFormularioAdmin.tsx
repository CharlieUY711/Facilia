"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import Link from "next/link";
import Card from "./Card";
import Button from "./Button";
import Input from "./Input";
import Select from "./Select";
import Textarea from "./Textarea";
import Modal from "./Modal";
import Combobox from "./Combobox";

// ── Tipos ──────────────────────────────────────────────────────

interface OpcionCampo {
  value: string;
  label: string;
  factor?: number;
}

// select_repetible guarda su plantilla bajo la clave "filas" (ver
// supabase/schema.sql, seed de la Etapa 5B) en vez del array simple
// {value,label} que usan select/number/text/boolean.
type OpcionesCampo = OpcionCampo[] | { filas: unknown[] } | null;

interface CampoAdmin {
  id: string;
  paso_id: string;
  nombre: string;
  codigo: string;
  tipo_input: "select" | "number" | "text" | "boolean" | "select_repetible";
  variable_id: string | null;
  opciones: OpcionesCampo;
  obligatorio: boolean;
  orden: number;
  activo: boolean;
}

interface PasoAdmin {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  cotizador_campos: CampoAdmin[];
}

interface VariableRef {
  id: string;
  nombre: string;
  codigo: string;
}

const TIPO_INPUT_OPCIONES = [
  { value: "select", label: "Selección única" },
  { value: "select_repetible", label: "Selección repetible" },
  { value: "number", label: "Número" },
  { value: "text", label: "Texto" },
  { value: "boolean", label: "Sí / No" },
];

const TIPO_INPUT_LABEL: Record<string, string> = Object.fromEntries(
  TIPO_INPUT_OPCIONES.map((o) => [o.value, o.label])
);

// tipo_input para los que tiene sentido un array de opciones {value,label}
// editable con el mini editor de lista.
const TIPOS_CON_OPCIONES_SIMPLES = new Set(["select"]);

function ordenarPorOrden<T extends { orden: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.orden - b.orden);
}

// ── Mini editor de lista de opciones {value,label} ───────────────

function OpcionesEditor({
  opciones,
  onChange,
}: {
  opciones: OpcionCampo[];
  onChange: (next: OpcionCampo[]) => void;
}) {
  function actualizarFila(i: number, patch: Partial<OpcionCampo>) {
    onChange(opciones.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function eliminarFila(i: number) {
    onChange(opciones.filter((_, idx) => idx !== i));
  }
  function moverFila(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= opciones.length) return;
    const next = [...opciones];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function agregarFila() {
    onChange([...opciones, { value: "", label: "" }]);
  }

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-navy/50">
        Opciones
      </label>
      {opciones.length === 0 && (
        <p className="text-xs text-ink/40 italic">Sin opciones todavía — agregá al menos una.</p>
      )}
      <div className="space-y-1.5">
        {opciones.map((o, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => moverFila(i, -1)}
                disabled={i === 0}
                className="text-ink/30 hover:text-navy disabled:opacity-20 text-xs leading-none px-1"
                aria-label="Subir"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moverFila(i, 1)}
                disabled={i === opciones.length - 1}
                className="text-ink/30 hover:text-navy disabled:opacity-20 text-xs leading-none px-1"
                aria-label="Bajar"
              >
                ▼
              </button>
            </div>
            <input
              value={o.value}
              onChange={(e) => actualizarFila(i, { value: e.target.value })}
              placeholder="value"
              className="w-1/3 rounded-lg border border-navy-100 px-2.5 py-1.5 text-sm text-ink font-mono outline-none focus:border-blue focus:ring-2 focus:ring-blue/30"
            />
            <input
              value={o.label}
              onChange={(e) => actualizarFila(i, { label: e.target.value })}
              placeholder="Etiqueta visible"
              className="flex-1 rounded-lg border border-navy-100 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/30"
            />
            <button
              type="button"
              onClick={() => eliminarFila(i)}
              className="text-red-500 hover:text-red-700 text-sm px-1.5"
              aria-label="Eliminar opción"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={agregarFila}
        className="text-xs font-semibold text-blue hover:underline"
      >
        + Agregar opción
      </button>
    </div>
  );
}

// ── Modal: crear/editar paso ──────────────────────────────────────

function PasoModal({
  open,
  onClose,
  onSaved,
  paso,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  paso: PasoAdmin | null; // null = alta
}) {
  const esEdicion = !!paso;
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNombre(paso?.nombre ?? "");
    setCodigo(paso?.codigo ?? "");
    setDescripcion(paso?.descripcion ?? "");
    setError(null);
  }, [open, paso]);

  async function guardar() {
    if (!nombre.trim()) return setError("El nombre es obligatorio");
    if (!esEdicion && !codigo.trim()) return setError("El código es obligatorio");

    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(
        esEdicion ? `/api/cotizador/pasos/${paso!.id}` : "/api/cotizador/pasos",
        {
          method: esEdicion ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            esEdicion
              ? { nombre: nombre.trim(), descripcion: descripcion.trim() || null }
              : { nombre: nombre.trim(), codigo: codigo.trim(), descripcion: descripcion.trim() || null }
          ),
        }
      );
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "No se pudo guardar el paso");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Error de red al guardar el paso");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={esEdicion ? "Editar paso" : "Nuevo paso"}>
      <div className="space-y-4">
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        <Input
          label="Código"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          disabled={esEdicion}
          hint={
            esEdicion
              ? "El código no se puede editar una vez creado (es la referencia estable del paso)."
              : "Identificador interno, sin espacios (ej. ESPACIO, AMBIENTES)."
          }
        />
        <Textarea
          label="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} loading={guardando}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: crear/editar campo ─────────────────────────────────────

function CampoModal({
  open,
  onClose,
  onSaved,
  pasoId,
  campo,
  variables,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  pasoId: string;
  campo: CampoAdmin | null; // null = alta
  variables: VariableRef[];
}) {
  const esEdicion = !!campo;
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tipoInput, setTipoInput] = useState<string>("select");
  const [obligatorio, setObligatorio] = useState(false);
  const [variableId, setVariableId] = useState("");
  const [opciones, setOpciones] = useState<OpcionCampo[]>([]);
  const [opcionesJsonRaw, setOpcionesJsonRaw] = useState(""); // fallback para select_repetible
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNombre(campo?.nombre ?? "");
    setCodigo(campo?.codigo ?? "");
    setTipoInput(campo?.tipo_input ?? "select");
    setObligatorio(campo?.obligatorio ?? false);
    setVariableId(campo?.variable_id ?? "");
    if (campo?.opciones && Array.isArray(campo.opciones)) {
      setOpciones(campo.opciones.map((o) => ({ value: o.value, label: o.label })));
      setOpcionesJsonRaw("");
    } else if (campo?.opciones && !Array.isArray(campo.opciones)) {
      setOpciones([]);
      setOpcionesJsonRaw(JSON.stringify(campo.opciones, null, 2));
    } else {
      setOpciones([]);
      setOpcionesJsonRaw("");
    }
    setError(null);
  }, [open, campo]);

  const usaVariable = variableId.trim().length > 0;
  const variableSeleccionada = variables.find((v) => v.id === variableId);

  async function guardar() {
    if (!nombre.trim()) return setError("El nombre es obligatorio");
    if (!codigo.trim()) return setError("El código es obligatorio");

    let opcionesPayload: OpcionesCampo = null;
    if (!usaVariable) {
      if (tipoInput === "select_repetible") {
        if (opcionesJsonRaw.trim()) {
          try {
            opcionesPayload = JSON.parse(opcionesJsonRaw);
          } catch {
            setError('El JSON de "filas" no es válido');
            return;
          }
        }
      } else if (TIPOS_CON_OPCIONES_SIMPLES.has(tipoInput)) {
        const limpias = opciones
          .map((o) => ({ value: o.value.trim(), label: o.label.trim() }))
          .filter((o) => o.value || o.label);
        if (limpias.some((o) => !o.value || !o.label)) {
          setError("Cada opción necesita value y etiqueta");
          return;
        }
        opcionesPayload = limpias;
      }
    }

    setGuardando(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        tipo_input: tipoInput,
        obligatorio,
        variable_id: usaVariable ? variableId : null,
        opciones: opcionesPayload,
      };
      if (!esEdicion) {
        body.paso_id = pasoId;
        body.orden = 999; // se re-ordena visualmente con las flechas ↑/↓
      }

      const res = await fetch(
        esEdicion ? `/api/cotizador/campos/${campo!.id}` : "/api/cotizador/campos",
        {
          method: esEdicion ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "No se pudo guardar el campo");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Error de red al guardar el campo");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={esEdicion ? "Editar campo" : "Nuevo campo"}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          <Input
            label="Código"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            hint="Se usa para resolverlo en el cotizador público."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Select
            label="Tipo de input"
            options={TIPO_INPUT_OPCIONES}
            value={tipoInput}
            onChange={(e) => setTipoInput(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer mt-1 sm:mt-6">
            <input
              type="checkbox"
              checked={obligatorio}
              onChange={(e) => setObligatorio(e.target.checked)}
              className="rounded border-navy-100 text-orange focus:ring-orange/30"
            />
            Campo obligatorio
          </label>
        </div>

        <Combobox
          label="Variable de precio vinculada (opcional)"
          placeholder="Buscar variable..."
          options={variables.map((v) => ({ value: v.id, label: `${v.nombre} (${v.codigo})` }))}
          value={variableId}
          onChange={setVariableId}
          clearLabel="Sin variable — usar opciones propias del campo"
        />

        {usaVariable ? (
          <p className="text-xs text-ink/60 bg-navy-50/50 rounded-lg px-3 py-2">
            Este campo usa los factores de precio de la variable{" "}
            <strong>{variableSeleccionada?.nombre ?? "seleccionada"}</strong>. Sus opciones se
            editan desde la sección{" "}
            <Link href="/panel/configuracion/cotizador" className="text-blue hover:underline">
              Variables
            </Link>
            , no acá.
          </p>
        ) : tipoInput === "select_repetible" ? (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-navy/50">
              Opciones (JSON avanzado — forma {"{ filas: [...] }"})
            </label>
            <textarea
              value={opcionesJsonRaw}
              onChange={(e) => setOpcionesJsonRaw(e.target.value)}
              rows={8}
              placeholder='{"filas":[{"codigo":"...","nombre":"...","tipo_input":"select","opciones":[...]}]}'
              className="w-full rounded-xl border border-navy-100 px-3 py-2 text-xs font-mono text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/30"
            />
            <p className="text-xs text-ink/50">
              select_repetible guarda una plantilla de sub-campos, no un array simple de
              value/label. Este editor no valida su estructura interna — dejalo vacío si no
              vas a tocarlo.
            </p>
          </div>
        ) : TIPOS_CON_OPCIONES_SIMPLES.has(tipoInput) ? (
          <OpcionesEditor opciones={opciones} onChange={setOpciones} />
        ) : (
          <p className="text-xs text-ink/40 italic">
            Este tipo de input ({TIPO_INPUT_LABEL[tipoInput]}) no usa opciones.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} loading={guardando}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Fila de campo (dentro de un paso expandido) ───────────────────

function CampoRow({
  campo,
  esPrimero,
  esUltimo,
  variableRef,
  onEditar,
  onEliminar,
  onReactivar,
  onMover,
}: {
  campo: CampoAdmin;
  esPrimero: boolean;
  esUltimo: boolean;
  variableRef: VariableRef | undefined;
  onEditar: () => void;
  onEliminar: () => void;
  onReactivar: () => void;
  onMover: (dir: -1 | 1) => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
        campo.activo ? "border-navy-100 bg-white" : "border-navy-100 bg-navy-50/40 opacity-70"
      }`}
    >
      <div className="flex flex-col pt-0.5">
        <button
          type="button"
          onClick={() => onMover(-1)}
          disabled={esPrimero}
          className="text-ink/30 hover:text-navy disabled:opacity-20 text-xs leading-none px-1"
          aria-label="Subir campo"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => onMover(1)}
          disabled={esUltimo}
          className="text-ink/30 hover:text-navy disabled:opacity-20 text-xs leading-none px-1"
          aria-label="Bajar campo"
        >
          ▼
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink text-sm">{campo.nombre}</span>
          <span className="text-xs text-ink/40 font-mono">{campo.codigo}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-navy-50 text-ink/50">
            {TIPO_INPUT_LABEL[campo.tipo_input] ?? campo.tipo_input}
          </span>
          {campo.obligatorio && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange/10 text-orange">
              Obligatorio
            </span>
          )}
          {!campo.activo && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              Inactivo
            </span>
          )}
        </div>
        {campo.variable_id && (
          <p className="text-xs text-ink/60 mt-1">
            Usa los factores de{" "}
            <Link
              href={`/panel/configuracion/cotizador#variable-${variableRef?.codigo ?? ""}`}
              className="text-blue hover:underline"
            >
              {variableRef?.nombre ?? "variable vinculada"}
            </Link>
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onEditar} className="text-xs font-medium text-blue hover:underline">
          Editar
        </button>
        {campo.activo ? (
          <button onClick={onEliminar} className="text-xs font-medium text-red-600 hover:underline">
            Eliminar
          </button>
        ) : (
          <button onClick={onReactivar} className="text-xs font-medium text-green-700 hover:underline">
            Reactivar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────

export default function CotizadorFormularioAdmin() {
  const [pasos, setPasos] = useState<PasoAdmin[]>([]);
  const [variables, setVariables] = useState<VariableRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  const [modalPaso, setModalPaso] = useState<{ abierto: boolean; paso: PasoAdmin | null }>({
    abierto: false,
    paso: null,
  });
  const [modalCampo, setModalCampo] = useState<{
    abierto: boolean;
    pasoId: string;
    campo: CampoAdmin | null;
  }>({ abierto: false, pasoId: "", campo: null });

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    setErrorGlobal(null);
    try {
      const [resPasos, resVars] = await Promise.all([
        fetch("/api/cotizador/pasos"),
        fetch("/api/cotizador/variables"),
      ]);
      const dataPasos: { ok: boolean; pasos?: PasoAdmin[]; error?: string } = await resPasos.json();
      const dataVars: { ok: boolean; variables?: VariableRef[]; error?: string } = await resVars.json();

      if (!dataPasos.ok || !dataPasos.pasos) {
        setErrorGlobal(dataPasos.error ?? "No se pudo cargar la estructura del cotizador");
        return;
      }
      setPasos(
        ordenarPorOrden(dataPasos.pasos).map((p) => ({
          ...p,
          cotizador_campos: ordenarPorOrden(p.cotizador_campos ?? []),
        }))
      );
      if (dataVars.ok && dataVars.variables) {
        setVariables(
          (dataVars.variables as any[]).map((v) => ({ id: v.id, nombre: v.nombre, codigo: v.codigo }))
        );
      }
    } catch {
      setErrorGlobal("Error de red al cargar la estructura del cotizador");
    } finally {
      setLoading(false);
    }
  }

  const variablesPorId = useMemo(() => {
    const m: Record<string, VariableRef> = {};
    for (const v of variables) m[v.id] = v;
    return m;
  }, [variables]);

  function toggleExpandido(pasoId: string) {
    setExpandido((prev) => ({ ...prev, [pasoId]: !prev[pasoId] }));
  }

  // ── Pasos ──────────────────────────────────────────────────────

  async function moverPaso(paso: PasoAdmin, dir: -1 | 1) {
    const idx = pasos.findIndex((p) => p.id === paso.id);
    const vecino = pasos[idx + dir];
    if (!vecino) return;

    // Optimista: swap local inmediato, después persiste ambos.
    const ordenPaso = paso.orden;
    const ordenVecino = vecino.orden;
    setPasos((prev) => {
      const next = [...prev];
      next[idx] = { ...vecino, orden: ordenPaso };
      next[idx + dir] = { ...paso, orden: ordenVecino };
      return ordenarPorOrden(next);
    });

    try {
      await Promise.all([
        fetch(`/api/cotizador/pasos/${paso.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orden: ordenVecino }),
        }),
        fetch(`/api/cotizador/pasos/${vecino.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orden: ordenPaso }),
        }),
      ]);
    } catch {
      setErrorGlobal("No se pudo guardar el nuevo orden de los pasos");
    }
    cargar();
  }

  async function eliminarPaso(paso: PasoAdmin) {
    if (!confirm(`¿Desactivar el paso "${paso.nombre}"? Sus campos dejan de mostrarse en el cotizador público, pero no se borran.`)) return;
    const res = await fetch(`/api/cotizador/pasos/${paso.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.ok) return setErrorGlobal(data.error ?? "No se pudo desactivar el paso");
    cargar();
  }

  async function reactivarPaso(paso: PasoAdmin) {
    const res = await fetch(`/api/cotizador/pasos/${paso.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: true }),
    });
    const data = await res.json();
    if (!data.ok) return setErrorGlobal(data.error ?? "No se pudo reactivar el paso");
    cargar();
  }

  // ── Campos ─────────────────────────────────────────────────────

  async function moverCampo(paso: PasoAdmin, campo: CampoAdmin, dir: -1 | 1) {
    const campos = paso.cotizador_campos;
    const idx = campos.findIndex((c) => c.id === campo.id);
    const vecino = campos[idx + dir];
    if (!vecino) return;

    const ordenCampo = campo.orden;
    const ordenVecino = vecino.orden;

    setPasos((prev) =>
      prev.map((p) => {
        if (p.id !== paso.id) return p;
        const next = [...p.cotizador_campos];
        next[idx] = { ...vecino, orden: ordenCampo };
        next[idx + dir] = { ...campo, orden: ordenVecino };
        return { ...p, cotizador_campos: ordenarPorOrden(next) };
      })
    );

    try {
      const res = await fetch("/api/cotizador/campos/reordenar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { id: campo.id, orden: ordenVecino },
            { id: vecino.id, orden: ordenCampo },
          ],
        }),
      });
      const data = await res.json();
      if (!data.ok) setErrorGlobal(data.error ?? "No se pudo guardar el nuevo orden de los campos");
    } catch {
      setErrorGlobal("No se pudo guardar el nuevo orden de los campos");
    }
    cargar();
  }

  async function eliminarCampo(campo: CampoAdmin) {
    if (!confirm(`¿Desactivar el campo "${campo.nombre}"? Deja de mostrarse en el cotizador público.`)) return;
    const res = await fetch(`/api/cotizador/campos/${campo.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.ok) return setErrorGlobal(data.error ?? "No se pudo desactivar el campo");
    cargar();
  }

  async function reactivarCampo(campo: CampoAdmin) {
    const res = await fetch(`/api/cotizador/campos/${campo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: true }),
    });
    const data = await res.json();
    if (!data.ok) return setErrorGlobal(data.error ?? "No se pudo reactivar el campo");
    cargar();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-lg text-navy mb-1">Pasos y campos del wizard</h2>
          <p className="text-sm text-ink/60">
            Los cambios acá se reflejan en <code className="text-xs">/cotizador</code> al instante,
            sin deploy.
          </p>
        </div>
        <Button onClick={() => setModalPaso({ abierto: true, paso: null })}>+ Agregar paso</Button>
      </div>

      {errorGlobal && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorGlobal}
        </div>
      )}

      {loading && (
        <Card padded={false} className="overflow-x-auto">
          <div className="text-center py-10 text-ink/40 text-sm">Cargando estructura...</div>
        </Card>
      )}

      {!loading && (
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full text-base">
            <thead className="bg-navy-50/50 text-ink/50 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-2.5"></th>
                <th className="text-left px-5 py-2.5">Paso</th>
                <th className="text-left px-5 py-2.5">Campos</th>
                <th className="text-left px-5 py-2.5">Estado</th>
                <th className="text-left px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {pasos.length === 0 && !errorGlobal && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-ink/40">
                    Todavía no hay pasos configurados.
                  </td>
                </tr>
              )}
              {pasos.map((paso, idx) => {
                const abierto = expandido[paso.id];
                return (
                  <Fragment key={paso.id}>
                    <tr
                      className={`border-t border-navy-100 hover:bg-navy-50/30 transition-colors cursor-pointer ${
                        !paso.activo ? "opacity-60" : ""
                      }`}
                      onClick={() => toggleExpandido(paso.id)}
                    >
                      <td className="px-5 py-2.5 w-16" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => moverPaso(paso, -1)}
                            disabled={idx === 0}
                            className="text-ink/30 hover:text-navy disabled:opacity-20 text-xs leading-none px-1"
                            aria-label="Subir paso"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moverPaso(paso, 1)}
                            disabled={idx === pasos.length - 1}
                            className="text-ink/30 hover:text-navy disabled:opacity-20 text-xs leading-none px-1"
                            aria-label="Bajar paso"
                          >
                            ▼
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 font-medium text-ink">
                        <span className="mr-2 text-ink/30">{abierto ? "▾" : "▸"}</span>
                        {paso.nombre}
                        <span className="ml-2 text-xs text-ink/40 font-mono">{paso.codigo}</span>
                        {paso.descripcion && (
                          <p className="text-sm text-ink/60 mt-0.5 ml-5">{paso.descripcion}</p>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-ink/70">
                        {paso.cotizador_campos.length} campo{paso.cotizador_campos.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-5 py-2.5">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            paso.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {paso.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModalPaso({ abierto: true, paso })}
                          >
                            Editar
                          </Button>
                          <Button
                            variant={paso.activo ? "danger" : "secondary"}
                            size="sm"
                            onClick={() => (paso.activo ? eliminarPaso(paso) : reactivarPaso(paso))}
                          >
                            {paso.activo ? "Eliminar" : "Reactivar"}
                          </Button>
                        </span>
                      </td>
                    </tr>
                    {abierto && (
                      <tr className="border-t border-navy-100 bg-navy-50/20">
                        <td colSpan={5} className="px-5 py-4">
                          <div className="space-y-2">
                            {paso.cotizador_campos.length === 0 && (
                              <p className="text-ink/40 text-sm">Este paso todavía no tiene campos.</p>
                            )}
                            {paso.cotizador_campos.map((campo, cIdx) => (
                              <CampoRow
                                key={campo.id}
                                campo={campo}
                                esPrimero={cIdx === 0}
                                esUltimo={cIdx === paso.cotizador_campos.length - 1}
                                variableRef={campo.variable_id ? variablesPorId[campo.variable_id] : undefined}
                                onEditar={() => setModalCampo({ abierto: true, pasoId: paso.id, campo })}
                                onEliminar={() => eliminarCampo(campo)}
                                onReactivar={() => reactivarCampo(campo)}
                                onMover={(dir) => moverCampo(paso, campo, dir)}
                              />
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setModalCampo({ abierto: true, pasoId: paso.id, campo: null })}
                            >
                              + Agregar campo
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <PasoModal
        open={modalPaso.abierto}
        onClose={() => setModalPaso({ abierto: false, paso: null })}
        onSaved={cargar}
        paso={modalPaso.paso}
      />
      <CampoModal
        open={modalCampo.abierto}
        onClose={() => setModalCampo({ abierto: false, pasoId: "", campo: null })}
        onSaved={cargar}
        pasoId={modalCampo.pasoId}
        campo={modalCampo.campo}
        variables={variables}
      />
    </div>
  );
}
