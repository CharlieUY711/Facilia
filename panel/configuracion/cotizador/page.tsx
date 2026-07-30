"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import CotizadorFormularioAdmin from "@/components/CotizadorFormularioAdmin";

// ── Tipos ────────────────────────────────────────────────────────

interface Opcion {
  id: string;
  variable_id: string;
  nombre: string;
  codigo: string;
  factor: number;
  precio_fijo: number | null;
  orden: number;
  activo: boolean;
  // Etapa 5D-bis — solo tienen sentido según la variable (ver TIPO_LABEL más abajo)
  rendimiento_m2_hora: number | null;
  insumos_m2: number | null;
  frecuencia_independiente: boolean;
  visitas_mes: number | null;
}

type CantidadFuente = "ninguna" | "input_cliente" | "cantidad_banos";
type Tab = "variables" | "parametros" | "pasos" | "documentacion";

// Agrupación de variables dentro de la tab "Variables" — mapeo explícito
// por código (a diferencia del filtro anterior por `orden`, acá hace falta
// distinguir 3 grupos dentro de las mismas variables "opcionales", así que
// una sola condición numérica no alcanza). Todo lo que no esté mapeado cae
// en "Otras" para que nunca desaparezca silenciosamente de la vista.
const GRUPO_ORDEN = ["Estructurales", "Operativas", "Vajilla", "Consumibles", "Otras"] as const;
type NombreGrupo = (typeof GRUPO_ORDEN)[number];
const GRUPO_POR_CODIGO: Record<string, NombreGrupo> = {
  TIPO_AMBIENTE: "Estructurales",
  tipo_espacio: "Estructurales",
  FRECUENCIA: "Estructurales",
  turnos: "Operativas",
  LAVAVAJILLAS_TIPO: "Operativas",
  CAFETERA_TIPO: "Operativas",
  DISPENSADOR_AGUA_TIPO: "Operativas",
  AMBIENTADORES: "Operativas",
  VAJILLA_CUBIERTOS_NIVEL: "Vajilla",
  VAJILLA_PLATOS_NIVEL: "Vajilla",
  VAJILLA_TAZAS_NIVEL: "Vajilla",
  VAJILLA_VASOS_NIVEL: "Vajilla",
  INSUMO_DETERGENTE_NIVEL: "Consumibles",
  INSUMO_TOALLAS_NIVEL: "Consumibles",
  INSUMO_JABON_NIVEL: "Consumibles",
  INSUMO_PAPEL_NIVEL: "Consumibles",
};
function grupoDeVariable(v: Variable): NombreGrupo {
  return GRUPO_POR_CODIGO[v.codigo] ?? "Otras";
}

interface Variable {
  id: string;
  nombre: string;
  codigo: string;
  tipo: string;
  afecta_precio: boolean;
  activo: boolean;
  cotizador_opciones?: Opcion[];
  // orden < 100: variables estructurales/operativas originales del wizard.
  // orden >= 100: opcionales de las Etapas 5G/5H (consumibles, vajilla,
  // lavavajillas, cafetera, dispensador, ambientadores) — convención ya
  // usada en las migraciones, se reutiliza acá para separar las tabs
  // "Variables" y "Consumibles" sin mantener una lista de códigos a mano.
  orden: number;
  // Etapa 5G — de dónde saca el motor la cantidad para multiplicar precio_fijo.
  // Ver lib/cotizador/engine.ts. Filas viejas (pre-5G) no la traían: default 'ninguna'.
  cantidad_fuente: CantidadFuente;
  unidad_cantidad: string | null;
  cantidad_min: number | null;
  cantidad_max: number | null;
}

interface Parametro {
  id: string;
  clave: string;
  valor: number;
  descripcion: string | null;
  // Auditoría — quién y cuándo guardó por última vez este parámetro.
  // Null en filas que nunca se volvieron a guardar desde que se agregó
  // esta columna (ver migración 2026_07_29_cotizador_config_auditoria.sql).
  actualizado_en: string | null;
  actualizado_por_perfil: { nombre: string | null; email: string } | null;
}

// Valores derivados de multiplicar/dividir un parámetro contra otros —
// se muestran de referencia en el mismo renglón, no se guardan en la BD.
// Hoy el único cruce con sentido en el motor (ver lib/cotizador/engine.ts)
// es "costo × (1 + margen/100)" para las claves que representan un costo
// base. Si mañana se agrega un parámetro nuevo sin cruce definido acá,
// simplemente no muestra columna derivada — no rompe nada.
function valorConMargen(clave: string, parametros: Parametro[]): { label: string; valor: number } | null {
  if (clave === "MARGEN_COMERCIAL") return null;
  const margen = parametros.find((p) => p.clave === "MARGEN_COMERCIAL");
  const propio = parametros.find((p) => p.clave === clave);
  if (!margen || !propio) return null;
  return {
    label: `${clave} × (1 + margen)`,
    valor: propio.valor * (1 + margen.valor / 100),
  };
}

function formatFechaHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TIPO_LABEL: Record<string, string> = {
  select: "Selección única",
  select_repetible: "Selección repetible",
  number: "Número",
  boolean: "Sí / No",
  text: "Texto",
  formula: "Fórmula",
};

// Etapa 5G — cómo obtiene el motor la cantidad para multiplicar precio_fijo.
// Ver comentario en lib/cotizador/engine.ts y en el prompt de continuación.
const CANTIDAD_FUENTE_LABEL: Record<CantidadFuente, string> = {
  ninguna: "Tarifa fija (cantidad = 1)",
  input_cliente: "El cliente ingresa la cantidad",
  cantidad_banos: "Cantidad de baños elegidos",
};
const CANTIDAD_FUENTE_AYUDA: Record<CantidadFuente, string> = {
  ninguna: "El motor multiplica precio_fijo × 1. No hace falta unidad ni rango.",
  input_cliente:
    "El cliente escribe un número en el wizard (ej. cantidad de personas). El motor multiplica precio_fijo × esa cantidad. Definí la unidad que se muestra y, si querés, un mínimo y un máximo permitido.",
  cantidad_banos:
    "El motor cuenta cuántos ambientes tipo BANO eligió el cliente (mínimo 1, mismo criterio que el motor legado) y multiplica precio_fijo × esa cantidad. No usa unidad_cantidad ni cantidad_min/max.",
};

// Campos de costo que solo aplican según qué variable es dueña de la opción.
// (Ver comentario en lib/cotizador/engine.ts — Etapa 5D-bis.)
function esVariableAmbiente(codigoVariable: string) {
  return codigoVariable === "TIPO_AMBIENTE";
}
function esVariableFrecuencia(codigoVariable: string) {
  return codigoVariable === "FRECUENCIA";
}

// Placeholder por defecto para valores de costo todavía sin confirmar por
// FACILIA. Se usa solo para pre-cargar el formulario de una opción nueva;
// nunca sobreescribe un valor ya guardado. Ver prompt de continuación
// Etapa 5D-bis: estos números NO son datos reales, son editables acá
// justamente para que dejen de serlo apenas FACILIA confirme los suyos.
const PLACEHOLDER_RENDIMIENTO = 20; // m² / hora, a confirmar
const PLACEHOLDER_INSUMOS = 5; // $ / m², a confirmar
const PLACEHOLDER_VISITAS_MES = 4; // visitas/mes, a confirmar

function opcionVacia(variable_id: string): Opcion {
  return {
    id: "",
    variable_id,
    nombre: "",
    codigo: "",
    factor: 1,
    precio_fijo: null,
    orden: 0,
    activo: true,
    rendimiento_m2_hora: PLACEHOLDER_RENDIMIENTO,
    insumos_m2: PLACEHOLDER_INSUMOS,
    frecuencia_independiente: false,
    visitas_mes: PLACEHOLDER_VISITAS_MES,
  };
}

export default function CotizadorConfig() {
  const router = useRouter();
  const [variables, setVariables] = useState<Variable[]>([]);
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("variables");
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({
    Estructurales: true,
    Operativas: true,
    Vajilla: true,
    Consumibles: true,
    Otras: true,
  });

  // Edición de opción (crear o editar) vía modal
  const [opcionEditando, setOpcionEditando] = useState<Opcion | null>(null);
  const [variableDeOpcion, setVariableDeOpcion] = useState<Variable | null>(null);
  const [guardandoOpcion, setGuardandoOpcion] = useState(false);
  const [errorOpcion, setErrorOpcion] = useState("");

  // Edición inline de parámetros
  const [valoresParametros, setValoresParametros] = useState<Record<string, string>>({});
  const [guardandoParametro, setGuardandoParametro] = useState<string | null>(null);
  const [avisoParametro, setAvisoParametro] = useState<Record<string, string>>({});

  // Edición de variable (Etapa 5G — cantidad_fuente/unidad_cantidad/cantidad_min/max)
  const [variableEditando, setVariableEditando] = useState<Variable | null>(null);
  const [guardandoVariable, setGuardandoVariable] = useState(false);
  const [errorVariable, setErrorVariable] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const [resVariables, resParametros] = await Promise.all([
      fetch("/api/cotizador/variables"),
      fetch("/api/cotizador/parametros"),
    ]);
    const dataVariables = await resVariables.json();
    const dataParametros = await resParametros.json();
    if (dataVariables.ok) {
      // Filas creadas antes de la Etapa 5G pueden no traer cantidad_fuente
      // (la columna tiene default 'ninguna' en la BD, esto es solo un
      // resguardo por si llega null desde algún camino viejo).
      const normalizadas: Variable[] = dataVariables.variables.map((v: any) => ({
        ...v,
        orden: v.orden ?? 0,
        cantidad_fuente: (v.cantidad_fuente ?? "ninguna") as CantidadFuente,
        unidad_cantidad: v.unidad_cantidad ?? null,
        cantidad_min: v.cantidad_min === undefined ? null : v.cantidad_min,
        cantidad_max: v.cantidad_max === undefined ? null : v.cantidad_max,
      }));
      setVariables(normalizadas);
    }
    if (dataParametros.ok) {
      setParametros(dataParametros.parametros);
      const iniciales: Record<string, string> = {};
      for (const p of dataParametros.parametros as Parametro[]) {
        iniciales[p.clave] = String(p.valor);
      }
      setValoresParametros(iniciales);
    }
    setLoading(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/panel/login");
    router.refresh();
  }

  // ── Parámetros globales (cotizador_config) ──────────────────────

  async function guardarParametro(clave: string) {
    const crudo = valoresParametros[clave];
    const valor = Number(crudo);
    if (crudo === undefined || crudo.trim() === "" || Number.isNaN(valor)) {
      setAvisoParametro((prev) => ({ ...prev, [clave]: "Ingresá un número válido" }));
      return;
    }
    setAvisoParametro((prev) => ({ ...prev, [clave]: "" }));
    setGuardandoParametro(clave);
    try {
      const res = await fetch("/api/cotizador/parametros", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave, valor }),
      });
      const data = await res.json();
      if (!data.ok) {
        setAvisoParametro((prev) => ({ ...prev, [clave]: data.error ?? "No se pudo guardar" }));
        return;
      }
      setParametros((prev) => prev.map((p) => (p.clave === clave ? data.parametros[0] ?? { ...p, valor } : p)));
      setAvisoParametro((prev) => ({ ...prev, [clave]: "Guardado ✓" }));
      setTimeout(() => setAvisoParametro((prev) => ({ ...prev, [clave]: "" })), 2000);
    } catch {
      setAvisoParametro((prev) => ({ ...prev, [clave]: "Error de conexión" }));
    } finally {
      setGuardandoParametro(null);
    }
  }

  // ── Opciones (cotizador_opciones) ────────────────────────────────

  function abrirNuevaOpcion(variable: Variable) {
    setVariableDeOpcion(variable);
    setOpcionEditando(opcionVacia(variable.id));
    setErrorOpcion("");
  }

  function abrirEditarOpcion(variable: Variable, opcion: Opcion) {
    setVariableDeOpcion(variable);
    setOpcionEditando({ ...opcion });
    setErrorOpcion("");
  }

  function cerrarModalOpcion() {
    setOpcionEditando(null);
    setVariableDeOpcion(null);
    setErrorOpcion("");
  }

  async function guardarOpcion() {
    if (!opcionEditando || !variableDeOpcion) return;

    if (!opcionEditando.nombre.trim() || !opcionEditando.codigo.trim()) {
      setErrorOpcion("Nombre y código son obligatorios");
      return;
    }

    const esNueva = !opcionEditando.id;
    const body: Record<string, unknown> = {
      nombre: opcionEditando.nombre.trim(),
      codigo: opcionEditando.codigo.trim().toUpperCase(),
      factor: opcionEditando.factor,
      precio_fijo: opcionEditando.precio_fijo,
      orden: opcionEditando.orden,
      activo: opcionEditando.activo,
    };
    if (esVariableAmbiente(variableDeOpcion.codigo)) {
      body.rendimiento_m2_hora = opcionEditando.rendimiento_m2_hora;
      body.insumos_m2 = opcionEditando.insumos_m2;
      body.frecuencia_independiente = opcionEditando.frecuencia_independiente;
    }
    if (esVariableFrecuencia(variableDeOpcion.codigo)) {
      body.visitas_mes = opcionEditando.visitas_mes;
    }
    if (esNueva) {
      body.variable_id = variableDeOpcion.id;
    }

    setGuardandoOpcion(true);
    setErrorOpcion("");
    try {
      const url = esNueva ? "/api/cotizador/opciones" : `/api/cotizador/opciones/${opcionEditando.id}`;
      const res = await fetch(url, {
        method: esNueva ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorOpcion(data.error ?? "No se pudo guardar");
        return;
      }
      await cargar();
      cerrarModalOpcion();
    } catch {
      setErrorOpcion("Error de conexión con el servidor");
    } finally {
      setGuardandoOpcion(false);
    }
  }

  async function alternarActivo(opcion: Opcion) {
    if (opcion.activo) {
      // Borrado lógico vía DELETE (activo=false)
      const res = await fetch(`/api/cotizador/opciones/${opcion.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) await cargar();
    } else {
      const res = await fetch(`/api/cotizador/opciones/${opcion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: true }),
      });
      const data = await res.json();
      if (data.ok) await cargar();
    }
  }

  // ── Variable (cantidad_fuente / unidad_cantidad / cantidad_min / max) ──

  function abrirEditarVariable(v: Variable) {
    setVariableEditando({ ...v });
    setErrorVariable("");
  }

  function cerrarModalVariable() {
    setVariableEditando(null);
    setErrorVariable("");
  }

  async function guardarVariable() {
    if (!variableEditando) return;

    if (
      variableEditando.cantidad_fuente === "input_cliente" &&
      variableEditando.cantidad_min !== null &&
      variableEditando.cantidad_max !== null &&
      variableEditando.cantidad_min > variableEditando.cantidad_max
    ) {
      setErrorVariable("El mínimo no puede ser mayor que el máximo");
      return;
    }

    const body: Record<string, unknown> = {
      cantidad_fuente: variableEditando.cantidad_fuente,
      unidad_cantidad:
        variableEditando.cantidad_fuente === "input_cliente" ? variableEditando.unidad_cantidad : null,
      cantidad_min: variableEditando.cantidad_fuente === "input_cliente" ? variableEditando.cantidad_min : null,
      cantidad_max: variableEditando.cantidad_fuente === "input_cliente" ? variableEditando.cantidad_max : null,
    };

    setGuardandoVariable(true);
    setErrorVariable("");
    try {
      const res = await fetch(`/api/cotizador/variables/${variableEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorVariable(data.error ?? "No se pudo guardar");
        return;
      }
      await cargar();
      cerrarModalVariable();
    } catch {
      setErrorVariable("Error de conexión con el servidor");
    } finally {
      setGuardandoVariable(false);
    }
  }

  const esCostoAmbiente = variableDeOpcion ? esVariableAmbiente(variableDeOpcion.codigo) : false;
  const esCostoFrecuencia = variableDeOpcion ? esVariableFrecuencia(variableDeOpcion.codigo) : false;

  // Ver GRUPO_POR_CODIGO arriba: agrupa las variables para la tab "Variables".
  const gruposConVariables: { grupo: NombreGrupo; lista: Variable[] }[] = GRUPO_ORDEN.map((grupo) => ({
    grupo,
    lista: variables.filter((v) => grupoDeVariable(v) === grupo),
  })).filter((g) => g.lista.length > 0);

  function toggleGrupo(grupo: NombreGrupo) {
    setGruposAbiertos((prev) => ({ ...prev, [grupo]: !prev[grupo] }));
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-white border-b border-navy-100 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src="/FACILIA_By.png" alt="FACILIA" width={120} height={30} />
            <Link href="/dashboard" className="text-sm text-ink/50 hover:text-navy transition-colors">
              ← Volver al Dashboard
            </Link>
          </div>
          <button onClick={handleLogout} className="text-sm text-ink/60 hover:text-navy transition-colors">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-5 sm:px-8 py-10 space-y-8">
        <h1 className="font-display font-bold text-2xl text-navy">Cotizador FACILIA</h1>

        {/* ── Barra de navegación por tabs ──────────────────────────── */}
        <nav className="flex flex-wrap gap-2 border-b border-navy-100 pb-3">
          {(
            [
              ["variables", "Variables"],
              ["parametros", "Parámetros"],
              ["pasos", "Pasos y Campos"],
              ["documentacion", "Documentación"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === id ? "bg-navy text-white" : "text-ink/60 hover:bg-navy-50"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ── Parámetros globales del motor de costo ─────────────── */}
        {tab === "parametros" && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-lg text-navy">Parámetros del motor</h2>
          </div>
          <p className="text-sm text-ink/60 mb-4">
            Costo de la hora de operario y margen comercial. Estos valores afectan el precio de{" "}
            <strong>todos</strong> los presupuestos calculados con el motor nuevo. Los que trae hoy son
            de referencia — confirmalos o corregilos y guardá.
          </p>
          <Card padded={false} className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-10 text-ink/40 text-sm">Cargando parámetros...</div>
            ) : parametros.length === 0 ? (
              <div className="text-center py-10 text-ink/40 text-sm">No hay parámetros configurados.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-navy-50/50 text-ink/50 text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3">Parámetro</th>
                    <th className="text-left px-5 py-3">Descripción</th>
                    <th className="text-left px-5 py-3">Valor</th>
                    <th className="text-left px-5 py-3">Con margen</th>
                    <th className="text-left px-5 py-3">Última modificación</th>
                    <th className="text-left px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {parametros.map((p) => {
                    const derivado = valorConMargen(p.clave, parametros);
                    const usuario = p.actualizado_por_perfil?.nombre || p.actualizado_por_perfil?.email;
                    return (
                      <tr key={p.id} className="border-t border-navy-100">
                        <td className="px-5 py-3 font-medium text-ink whitespace-nowrap">{p.clave}</td>
                        <td className="px-5 py-3 text-ink/60">{p.descripcion ?? "—"}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="any"
                              value={valoresParametros[p.clave] ?? ""}
                              onChange={(e) =>
                                setValoresParametros((prev) => ({ ...prev, [p.clave]: e.target.value }))
                              }
                              className="w-28 rounded-lg border border-navy-100 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
                            />
                            {avisoParametro[p.clave] && (
                              <span
                                className={
                                  avisoParametro[p.clave] === "Guardado ✓"
                                    ? "text-xs text-green-700"
                                    : "text-xs text-red-600"
                                }
                              >
                                {avisoParametro[p.clave]}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-ink/60 whitespace-nowrap" title={derivado?.label}>
                          {derivado
                            ? derivado.valor.toLocaleString("es-UY", { maximumFractionDigits: 2 })
                            : "—"}
                        </td>
                        <td className="px-5 py-3 text-ink/50 text-xs whitespace-nowrap">
                          {formatFechaHora(p.actualizado_en)}
                          {usuario && (
                            <>
                              <br />
                              <span className="text-ink/40">por {usuario}</span>
                            </>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={guardandoParametro === p.clave}
                            onClick={() => guardarParametro(p.clave)}
                          >
                            Guardar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </section>
        )}

        {/* ── Variables, agrupadas y plegables ─────────────────────── */}
        {tab === "variables" && (
        <section className="space-y-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-navy mb-1">Variables y opciones</h2>
            <p className="text-sm text-ink/60">
              Agrupadas por tipo. Tocá el título de cada grupo para plegarlo/desplegarlo.
            </p>
          </div>

          {loading && <Card className="text-center py-10 text-ink/40 text-sm">Cargando configuración...</Card>}

          {!loading && gruposConVariables.length === 0 && (
            <Card className="text-center py-10 text-ink/40 text-sm">No hay variables configuradas todavía.</Card>
          )}

          {!loading &&
            gruposConVariables.map(({ grupo, lista }) => {
              const abierto = gruposAbiertos[grupo] ?? true;
              return (
                <div key={grupo}>
                  <button
                    onClick={() => toggleGrupo(grupo)}
                    className="w-full flex items-center justify-between px-1 py-2 text-left"
                  >
                    <h3 className="font-display font-semibold text-base text-navy">
                      <span className="mr-2 text-ink/30">{abierto ? "▾" : "▸"}</span>
                      {grupo}
                      <span className="ml-2 text-sm font-normal text-ink/40">
                        ({lista.length} variable{lista.length === 1 ? "" : "s"})
                      </span>
                    </h3>
                  </button>
                  {abierto && (
                    <Card padded={false} className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-navy-50/50 text-ink/50 text-xs uppercase">
                          <tr>
                            <th className="text-left px-5 py-3">Variable</th>
                            <th className="text-left px-5 py-3">Código</th>
                            <th className="text-left px-5 py-3">Tipo</th>
                            <th className="text-left px-5 py-3">Cantidad</th>
                            <th className="text-left px-5 py-3">Opciones</th>
                            <th className="text-left px-5 py-3">Afecta precio</th>
                            <th className="text-left px-5 py-3">Estado</th>
                            <th className="text-left px-5 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lista.map((v) => {
                            const opciones = v.cotizador_opciones ?? [];
                            const abierta = expandido === v.id;
                            return (
                              <>
                                <tr
                                  key={v.id}
                                  id={`variable-${v.codigo}`}
                                  className="border-t border-navy-100 hover:bg-navy-50/30 transition-colors scroll-mt-24 cursor-pointer"
                                  onClick={() => setExpandido(abierta ? null : v.id)}
                                >
                                  <td className="px-5 py-3 font-medium text-ink">
                                    <span className="mr-2 text-ink/30">{abierta ? "▾" : "▸"}</span>
                                    {v.nombre}
                                  </td>
                                  <td className="px-5 py-3 text-ink/70">{v.codigo}</td>
                                  <td className="px-5 py-3 text-ink/70">{TIPO_LABEL[v.tipo] ?? v.tipo}</td>
                                  <td className="px-5 py-3 text-ink/70">
                                    <span
                                      className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                                        v.cantidad_fuente === "ninguna"
                                          ? "bg-navy-50 text-ink/50"
                                          : "bg-orange-100 text-orange-700"
                                      }`}
                                    >
                                      {CANTIDAD_FUENTE_LABEL[v.cantidad_fuente]}
                                    </span>
                                    {v.cantidad_fuente === "input_cliente" && (
                                      <div className="text-xs text-ink/40 mt-1">
                                        {v.unidad_cantidad ?? "sin unidad"}
                                        {(v.cantidad_min !== null || v.cantidad_max !== null) &&
                                          ` (${v.cantidad_min ?? "sin mín."}–${v.cantidad_max ?? "sin máx."})`}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-ink/70">{opciones.length} opción(es)</td>
                                  <td className="px-5 py-3">
                                    <span
                                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                        v.afecta_precio ? "bg-blue-100 text-blue-700" : "bg-navy-50 text-ink/50"
                                      }`}
                                    >
                                      {v.afecta_precio ? "Sí" : "No"}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span
                                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                        v.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {v.activo ? "Activa" : "Inactiva"}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3">
                                    {/* span envolvente: corta la propagación del click antes de
                                        que llegue al <tr> (que expande/colapsa la fila), sin
                                        asumir que Button reciba el evento nativo como parámetro. */}
                                    <span onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="sm" onClick={() => abrirEditarVariable(v)}>
                                        Editar variable
                                      </Button>
                                    </span>
                                  </td>
                                </tr>
                                {abierta && (
                                  <tr key={`${v.id}-detalle`} className="border-t border-navy-100 bg-navy-50/20">
                                    <td colSpan={8} className="px-5 py-4">
                                      <div className="space-y-2">
                                        {opciones.length === 0 && (
                                          <p className="text-ink/40 text-sm">
                                            Esta variable todavía no tiene opciones.
                                          </p>
                                        )}
                                        {opciones.map((o) => (
                                          <div
                                            key={o.id}
                                            className="flex items-center justify-between bg-white rounded-xl border border-navy-100 px-4 py-2.5"
                                          >
                                            <div className="text-sm">
                                              <span className="font-medium text-ink">{o.nombre}</span>{" "}
                                              <span className="text-ink/40">({o.codigo})</span>
                                              <span className="ml-3 text-ink/60">factor x{o.factor}</span>
                                              {o.precio_fijo !== null && (
                                                <span className="ml-3 text-ink/60">fijo ${o.precio_fijo}</span>
                                              )}
                                              {esVariableAmbiente(v.codigo) && (
                                                <span className="ml-3 text-ink/60">
                                                  rend. {o.rendimiento_m2_hora ?? "—"} m²/h · insumos $
                                                  {o.insumos_m2 ?? "—"}/m²
                                                  {o.frecuencia_independiente ? " · tarifa fija mensual" : ""}
                                                </span>
                                              )}
                                              {esVariableFrecuencia(v.codigo) && (
                                                <span className="ml-3 text-ink/60">
                                                  {o.visitas_mes ?? "—"} visitas/mes
                                                </span>
                                              )}
                                              {!o.activo && (
                                                <span className="ml-3 text-xs font-semibold text-red-600">
                                                  Inactiva
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Button variant="ghost" size="sm" onClick={() => abrirEditarOpcion(v, o)}>
                                                Editar
                                              </Button>
                                              <Button
                                                variant={o.activo ? "danger" : "secondary"}
                                                size="sm"
                                                onClick={() => alternarActivo(o)}
                                              >
                                                {o.activo ? "Desactivar" : "Reactivar"}
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                        <Button variant="ghost" size="sm" onClick={() => abrirNuevaOpcion(v)}>
                                          + Nueva opción
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    </Card>
                  )}
                </div>
              );
            })}
        </section>
        )}

        {/* ── Pasos y Campos (Etapa 5C) — mismo componente que usaba la ruta
             /panel/configuracion/cotizador/formulario, ahora embebido acá.
             Esa ruta sigue existiendo por si quedó algo enlazado, pero el
             uso normal es esta tab. ─────────────────────────────────── */}
        {tab === "pasos" && <CotizadorFormularioAdmin />}

        {/* ── Documentación — cómo se calcula el precio y dónde se edita
             cada valor. Contenido estático, no llama a ninguna API. ──── */}
        {tab === "documentacion" && (
          <section className="space-y-6 max-w-3xl">
            <div>
              <h2 className="font-display font-semibold text-lg text-navy mb-2">Cómo se calcula el precio</h2>
              <p className="text-sm text-ink/70 leading-relaxed">
                Por cada ambiente que eligió el cliente (ej. 2 oficinas + 1 baño) el motor calcula un
                costo por visita y lo multiplica por las visitas del mes (salvo que la opción sea
                "tarifa fija mensual"). Después suma todos los ambientes, más los consumibles/opcionales
                elegidos, más los adicionales, y aplica el margen comercial:
              </p>
              <Card className="mt-3 font-mono text-xs text-ink/80 leading-relaxed whitespace-pre-wrap">
{`costo_ambiente_por_visita = (m² / rendimiento_m2_hora) × HORA_OPERARIO + m² × insumos_m2
costo_ambiente_mensual    = costo_ambiente_por_visita × visitas_mes
                             (o solo costo_ambiente_por_visita si es "tarifa fija mensual")

costo_mensual  = Σ ambientes + Σ consumibles/opcionales + Σ adicionales
precio_mensual = costo_mensual × (1 + MARGEN_COMERCIAL / 100)`}
              </Card>
            </div>

            <div>
              <h2 className="font-display font-semibold text-lg text-navy mb-2">Dónde se edita cada valor</h2>
              <Card padded={false} className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-navy-50/50 text-ink/50 text-xs uppercase">
                    <tr>
                      <th className="text-left px-5 py-3">Valor</th>
                      <th className="text-left px-5 py-3">Dónde se edita</th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr]:border-t [&>tr]:border-navy-100">
                    <tr>
                      <td className="px-5 py-3 font-medium text-ink whitespace-nowrap">
                        HORA_OPERARIO, MARGEN_COMERCIAL, PRECIO_M2_BASE
                      </td>
                      <td className="px-5 py-3 text-ink/70">
                        Tab <strong>Parámetros</strong> — es global, afecta todos los presupuestos.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-medium text-ink whitespace-nowrap">
                        Rendimiento y costo de insumos por m²
                      </td>
                      <td className="px-5 py-3 text-ink/70">
                        Tab <strong>Variables</strong> → grupo "Estructurales" → variable "Tipo de ambiente" →
                        Editar en cada opción.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-medium text-ink whitespace-nowrap">Visitas por mes</td>
                      <td className="px-5 py-3 text-ink/70">
                        Tab <strong>Variables</strong> → grupo "Estructurales" → variable "Frecuencia de
                        visita" → Editar en cada opción.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-medium text-ink whitespace-nowrap">
                        Precio de vajilla, insumos de baño/cocina, lavavajillas, cafetera, dispensador,
                        ambientadores
                      </td>
                      <td className="px-5 py-3 text-ink/70">
                        Tab <strong>Variables</strong> → grupo "Consumibles" o "Vajilla" → cada variable →
                        Editar en cada opción → campo "Precio fijo".
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-medium text-ink whitespace-nowrap">
                        De dónde sale la cantidad (por persona, por baño, tarifa fija)
                      </td>
                      <td className="px-5 py-3 text-ink/70">
                        Tab <strong>Variables</strong> → grupo "Consumibles" o "Vajilla" → botón "Editar
                        variable" en la fila (no en la opción).
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-medium text-ink whitespace-nowrap">
                        Add-ons fijos (sanitización de vajilla, "incluir dispensador")
                      </td>
                      <td className="px-5 py-3 text-ink/70">
                        Todavía sin edición desde el panel — viven en la tabla{" "}
                        <code className="text-xs">cotizador_extras</code>, se editan por SQL directo por ahora.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-medium text-ink whitespace-nowrap">Pasos y campos del wizard</td>
                      <td className="px-5 py-3 text-ink/70">
                        Tab <strong>Pasos y Campos</strong>.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-1.5">
                Importante — precios de mentira
              </p>
              <p className="text-sm text-ink/70 leading-relaxed">
                Todos los valores que trae hoy este panel (rendimiento, insumos, precios fijos) son
                placeholders cargados por las migraciones de las Etapas 5D-bis/5G/5H, no precios reales
                de FACILIA. El motor nuevo (<code className="text-xs">lib/cotizador/engine.ts</code>) sigue
                en modo shadow: el cotizador público sigue usando el motor legado hasta que alguien de
                FACILIA con visibilidad comercial confirme estos números.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* ── Modal edición/creación de opción ─────────────────────── */}
      <Modal
        open={opcionEditando !== null}
        onClose={cerrarModalOpcion}
        title={opcionEditando?.id ? "Editar opción" : "Nueva opción"}
      >
        {opcionEditando && variableDeOpcion && (
          <div className="space-y-4">
            <p className="text-xs text-ink/50">
              Variable: <span className="font-semibold text-ink/70">{variableDeOpcion.nombre}</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nombre"
                value={opcionEditando.nombre}
                onChange={(e) => setOpcionEditando({ ...opcionEditando, nombre: e.target.value })}
              />
              <Input
                label="Código"
                value={opcionEditando.codigo}
                onChange={(e) => setOpcionEditando({ ...opcionEditando, codigo: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Factor"
                type="number"
                step="any"
                value={opcionEditando.factor}
                onChange={(e) =>
                  setOpcionEditando({ ...opcionEditando, factor: Number(e.target.value) })
                }
              />
              <Input
                label="Precio fijo (opcional)"
                type="number"
                step="any"
                value={opcionEditando.precio_fijo ?? ""}
                onChange={(e) =>
                  setOpcionEditando({
                    ...opcionEditando,
                    precio_fijo: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>

            {esCostoAmbiente && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3.5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  Modelo de costo (Etapa 5D-bis) — a confirmar con FACILIA
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Rendimiento (m²/hora)"
                    type="number"
                    step="any"
                    value={opcionEditando.rendimiento_m2_hora ?? ""}
                    onChange={(e) =>
                      setOpcionEditando({
                        ...opcionEditando,
                        rendimiento_m2_hora: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    label="Insumos ($/m²)"
                    type="number"
                    step="any"
                    value={opcionEditando.insumos_m2 ?? ""}
                    onChange={(e) =>
                      setOpcionEditando({
                        ...opcionEditando,
                        insumos_m2: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-ink/70">
                  <input
                    type="checkbox"
                    checked={opcionEditando.frecuencia_independiente}
                    onChange={(e) =>
                      setOpcionEditando({ ...opcionEditando, frecuencia_independiente: e.target.checked })
                    }
                  />
                  Tarifa mensual fija (no depende de la frecuencia — ej. Espacios comunes)
                </label>
              </div>
            )}

            {esCostoFrecuencia && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-2">
                  Modelo de costo (Etapa 5D-bis)
                </p>
                <Input
                  label="Visitas por mes"
                  type="number"
                  step="any"
                  value={opcionEditando.visitas_mes ?? ""}
                  onChange={(e) =>
                    setOpcionEditando({
                      ...opcionEditando,
                      visitas_mes: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            )}

            {errorOpcion && <p className="text-sm text-red-600">{errorOpcion}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={cerrarModalOpcion}>
                Cancelar
              </Button>
              <Button loading={guardandoOpcion} onClick={guardarOpcion}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal edición de variable — Etapa 5G (cantidad_fuente) ──── */}
      <Modal open={variableEditando !== null} onClose={cerrarModalVariable} title="Editar variable">
        {variableEditando && (
          <div className="space-y-4">
            <p className="text-xs text-ink/50">
              Variable: <span className="font-semibold text-ink/70">{variableEditando.nombre}</span>{" "}
              <span className="text-ink/40">({variableEditando.codigo})</span>
            </p>

            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1.5">
                ¿De dónde saca el motor la cantidad?
              </label>
              <select
                value={variableEditando.cantidad_fuente}
                onChange={(e) =>
                  setVariableEditando({
                    ...variableEditando,
                    cantidad_fuente: e.target.value as CantidadFuente,
                  })
                }
                className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
              >
                <option value="ninguna">{CANTIDAD_FUENTE_LABEL.ninguna}</option>
                <option value="input_cliente">{CANTIDAD_FUENTE_LABEL.input_cliente}</option>
                <option value="cantidad_banos">{CANTIDAD_FUENTE_LABEL.cantidad_banos}</option>
              </select>
              <p className="text-xs text-ink/50 mt-1.5">
                {CANTIDAD_FUENTE_AYUDA[variableEditando.cantidad_fuente]}
              </p>
            </div>

            {variableEditando.cantidad_fuente === "input_cliente" && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3.5 space-y-3">
                <Input
                  label="Unidad que se muestra al cliente (ej. personas, unidades)"
                  value={variableEditando.unidad_cantidad ?? ""}
                  onChange={(e) =>
                    setVariableEditando({
                      ...variableEditando,
                      unidad_cantidad: e.target.value === "" ? null : e.target.value,
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Cantidad mínima (opcional)"
                    type="number"
                    step="any"
                    value={variableEditando.cantidad_min ?? ""}
                    onChange={(e) =>
                      setVariableEditando({
                        ...variableEditando,
                        cantidad_min: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    label="Cantidad máxima (opcional)"
                    type="number"
                    step="any"
                    value={variableEditando.cantidad_max ?? ""}
                    onChange={(e) =>
                      setVariableEditando({
                        ...variableEditando,
                        cantidad_max: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            )}

            {errorVariable && <p className="text-sm text-red-600">{errorVariable}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={cerrarModalVariable}>
                Cancelar
              </Button>
              <Button loading={guardandoVariable} onClick={guardarVariable}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
