"use client";

import { useState, useEffect, useMemo } from "react";
import Card from "./Card";
import PriceSummary from "./PriceSummary";
import Input from "./Input";
import Select from "./Select";
import Button from "./Button";

// ── Catálogos ──────────────────────────────────────────────────

// Clasificación general del comercio (solo 4 opciones, sin tarifa propia)
const TIPOS_ESPACIO: { value: string; label: string; sublabel?: string }[] = [
  { value: "oficina", label: "Oficina" },
  { value: "local_comercial", label: "Local comercial" },
  { value: "deposito", label: "Depósito" },
  { value: "edificio", label: "Edificio", sublabel: "(Áreas comunes)" },
];

// Catálogo de ambientes (nivel habitación/sala), usado en la tabla de espacios
const AMBIENTES = [
  { value: "bano", label: "Baño" },
  { value: "cocina", label: "Cocina" },
  { value: "sala_reuniones", label: "Sala de reuniones" },
  { value: "oficina", label: "Oficina" },
  { value: "auditorio", label: "Auditorio" },
  { value: "espacios_comunes", label: "Espacios comunes" },
  { value: "barbacoa", label: "Barbacoa / Parrillero" },
];

const PLANTAS_OPCIONES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "10+"].map((v) => ({
  value: v,
  label: `${v} planta${v === "1" ? "" : "s"}`,
}));

const SUBSUELOS_OPCIONES = [
  { value: "0", label: "Sin subsuelo" },
  { value: "1", label: "1 subsuelo" },
  { value: "2", label: "2 subsuelos" },
  { value: "3", label: "3 subsuelos" },
  { value: "4+", label: "4 o más" },
];

const BARBACOA_PERSONAS_OPCIONES = [
  { value: "", label: "Sin barbacoa" },
  { value: "hasta_10", label: "Hasta 10 personas" },
  { value: "11_20", label: "11 a 20 personas" },
  { value: "21_50", label: "21 a 50 personas" },
  { value: "mas_50", label: "Más de 50 personas" },
];

const TURNOS_OPCIONES = [
  { value: "1", label: "1 turno" },
  { value: "2", label: "2 turnos" },
  { value: "3", label: "3 turnos" },
  { value: "4", label: "4 turnos" },
  { value: "otro", label: "Otro" },
];

const SI_NO_OPCIONES = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
];

const FRECUENCIAS = [
  { value: "1x_semana", label: "1 vez por semana" },
  { value: "2x_semana", label: "2 veces por semana" },
  { value: "3x_semana", label: "3 veces por semana" },
  { value: "5x_semana", label: "5 veces por semana (L-V)" },
  { value: "diario", label: "Diario (incl. fines de semana)" },
];

const CAFETERAS = [
  { value: "", label: "Sin cafetera" },
  { value: "capsulas", label: "Cápsulas" },
  { value: "espresso", label: "Espresso" },
  { value: "filtro", label: "Filtro" },
];

const DISPENSADORES = [
  { value: "", label: "Sin dispensador" },
  { value: "frio_caliente", label: "Frío / Caliente" },
  { value: "con_filtro", label: "Con filtro" },
  { value: "osmosis", label: "Ósmosis inversa" },
  { value: "compacto", label: "Compacto" },
];

const VAJILLA_TIPOS = [
  { value: "", label: "Sin vajilla" },
  { value: "estandar", label: "Estándar" },
  { value: "premium", label: "Premium" },
  { value: "personalizada", label: "Personalizada" },
];

const VAJILLA_PLAZOS = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "trimestre", label: "Trimestre" },
  { value: "semestre", label: "Semestre" },
  { value: "anio", label: "Año" },
  { value: "contrato", label: "Contrato" },
];

const VAJILLA_CANTIDADES = ["3", "6", "9", "12", "15", "18", "24", "personalizado"];

const LAVAVAJILLAS_TIPOS = [
  { value: "", label: "Sin lavavajillas" },
  { value: "de_mesas", label: "De mesas" },
  { value: "de_piso", label: "De piso" },
];

const AMBIENTADORES_CANTIDADES = [
  { value: "", label: "Sin ambientadores" },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
];

const NIVELES_INSUMO = [
  { value: "estandar", label: "Estándar" },
  { value: "premium", label: "Premium" },
  { value: "ultra_premium", label: "Ultra premium" },
];

const INSUMOS_COCINA_BANO = [
  { key: "detergente", label: "Detergente" },
  { key: "toallas_papel", label: "Toallas de papel" },
  { key: "jabon_liquido", label: "Jabón líquido" },
  { key: "papel_higienico", label: "Papel higiénico" },
] as const;

type InsumoCocinaBanoKey = (typeof INSUMOS_COCINA_BANO)[number]["key"];

function labelFor(options: { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}

// ── ETAPA 5D — Estructura dinámica desde /api/cotizador/formulario ──────
//
// A partir de acá el wizard deja de usar SOLO los catálogos fijos de
// arriba: los resuelve contra la respuesta de GET /api/cotizador/formulario
// (pasos → campos → opciones), y usa los catálogos fijos de arriba como
// FALLBACK cuando un campo no aparece en la API o viene sin opciones.
//
// CONFIRMADO contra /api/cotizador/formulario real (no contra el seed de
// schema.sql, que quedó desalineado con lo que hay cargado en la base):
// - `paso.codigo` viene `null` para los pasos existentes — no se puede
//   agrupar/matchear por código de paso.
// - `campo.codigo` sí viene poblado, pero con casing que no coincide
//   1:1 con lo asumido (ej. "TIPO_ESPACIO" en mayúsculas en vez de
//   "tipo_espacio").
// Por eso el matching YA NO depende del código del paso: busca cada campo
// por su propio `codigo` en TODOS los pasos, normalizando mayúsc/minúsc.
// Si algún código puntual sigue sin coincidir, el catálogo correspondiente
// no se encuentra y el componente cae automáticamente al catálogo legado
// de arriba (mismo resultado visible), sin romper el wizard.

interface OpcionCampoAPI {
  value: string;
  label: string;
  factor?: number;
}

interface CampoAPI {
  id: string;
  nombre: string;
  codigo: string;
  tipo_input: "select" | "number" | "text" | "boolean" | "select_repetible";
  obligatorio: boolean;
  orden: number;
  opciones: OpcionCampoAPI[] | { filas: OpcionCampoAPI[] } | null;
}

interface PasoAPI {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
  descripcion: string | null;
  campos: CampoAPI[];
}

// Códigos de campo esperados (ver comentario arriba). Ya NO hay un objeto
// PASO: el paso al que pertenece cada campo dejó de ser parte del matching,
// porque `paso.codigo` viene `null` en la base real. `buscarCampoPorCodigo`
// busca directamente por `campo.codigo` en todos los pasos.
const CAMPO = {
  tipo_espacio: "tipo_espacio",
  turnos: "turnos",
  plantas: "plantas",
  subsuelos: "subsuelos",
  barbacoa_personas: "barbacoa_personas",
  tipo_ambiente: "tipo_ambiente", // select_repetible → opciones = { filas: [...] }
  frecuencia: "frecuencia",
  vajilla_tipo: "vajilla_tipo",
  vajilla_plazo: "vajilla_plazo",
  vajilla_cantidad: "vajilla_cantidad",
  lavavajillas_tipo: "lavavajillas_tipo",
  cafetera: "cafetera",
  dispensador_agua: "dispensador_agua",
  ambientadores_cantidad: "ambientadores_cantidad",
} as const;

// Normaliza un código para comparar sin depender de mayúsc/minúsc ni de
// espacios accidentales (la base real trae, p. ej., "TIPO_ESPACIO").
function normalizarCodigo(codigo: string | null | undefined): string {
  return (codigo ?? "").trim().toLowerCase();
}

// Busca un campo por su propio código en TODOS los pasos, sin depender del
// código del paso (que viene `null` en la base real — ver comentario más
// arriba). Si dos campos de distintos pasos compartieran código, devuelve
// el primero que aparece según el orden de `pasos`/`campos` de la API.
function buscarCampoPorCodigo(pasos: PasoAPI[], campoCodigo: string): CampoAPI | undefined {
  const objetivo = normalizarCodigo(campoCodigo);
  for (const paso of pasos) {
    const encontrado = paso.campos.find((c) => normalizarCodigo(c.codigo) === objetivo);
    if (encontrado) return encontrado;
  }
  return undefined;
}

// Opciones planas {value,label} para un campo tipo "select": si el campo no
// vino en la API (o vino sin opciones), usa el catálogo legado — fail-safe,
// nunca deja un select vacío en producción por un código mal asumido.
function conOpciones(
  campo: CampoAPI | undefined,
  fallback: { value: string; label: string }[]
): { value: string; label: string }[] {
  if (campo && Array.isArray(campo.opciones) && campo.opciones.length > 0) {
    return campo.opciones.map((o) => ({ value: o.value, label: o.label }));
  }
  return fallback;
}

// Igual que conOpciones, pero para tipo_input = "select_repetible", cuyas
// opciones vienen con la forma { filas: [...] } (ver comentario en
// app/api/cotizador/formulario/route.ts).
function conFilas(
  campo: CampoAPI | undefined,
  fallback: { value: string; label: string }[]
): { value: string; label: string }[] {
  if (campo && campo.opciones && !Array.isArray(campo.opciones)) {
    const filas = (campo.opciones as { filas: OpcionCampoAPI[] }).filas;
    if (Array.isArray(filas) && filas.length > 0) {
      return filas.map((o) => ({ value: o.value, label: o.label }));
    }
  }
  return fallback;
}

// La tabla cotizador_opciones no tiene columna de "sublabel"; el único caso
// hoy es "Edificio (Áreas comunes)". Se mantiene como enriquecimiento
// puramente visual sobre el label dinámico — no es parte del catálogo ni
// del valor que se guarda.
const SUBLABELS_TIPO_ESPACIO: Record<string, string> = {
  edificio: "(Áreas comunes)",
};

// Igual que VAJILLA_CANTIDADES pero ya en forma de opciones {value,label},
// para poder usarlo como fallback de conOpciones (antes vivía inline en el JSX).
const VAJILLA_CANTIDAD_OPCIONES_LEGADO = [
  { value: "", label: "—" },
  ...VAJILLA_CANTIDADES.map((c) => ({
    value: c,
    label: c === "personalizado" ? "Personalizado" : c,
  })),
];

let idCounter = 0;
function newId() {
  idCounter += 1;
  return `amb_${Date.now()}_${idCounter}`;
}

interface AmbienteRow {
  id: string;
  tipo_ambiente: string;
  m2: string;
  usuarios: string;
  luz_natural: string; // "si" | "no" | ""
  ventana: string; // "si" | "no" | ""
}

// ── Campos con la etiqueta dentro del control (estilo "boxed") ──

function BoxSelect({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-navy-100 px-3.5 py-2 focus-within:ring-2 focus-within:ring-orange/30 focus-within:border-orange transition-colors bg-white ${className}`}
    >
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-navy/50">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-transparent text-sm text-ink outline-none border-0 p-0 mt-0.5"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BoxInput({
  label,
  className = "",
  ...props
}: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      className={`rounded-xl border border-navy-100 px-3.5 py-2 focus-within:ring-2 focus-within:ring-orange/30 focus-within:border-orange transition-colors bg-white ${className}`}
    >
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-navy/50">
        {label}
      </label>
      <input
        {...props}
        className={`w-full bg-transparent text-sm text-ink outline-none border-0 p-0 mt-0.5 ${
          props.type === "number" ? "text-right" : ""
        }`}
      />
    </div>
  );
}

function InlineSelect({
  label,
  value,
  onChange,
  options,
  caption,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  caption?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-navy-100 px-4 py-2.5 bg-white focus-within:ring-2 focus-within:ring-orange/30 focus-within:border-orange transition-colors">
        <label className="text-sm font-medium text-navy shrink-0">{label}</label>
        <select
          value={value}
          onChange={onChange}
          className="bg-transparent text-sm text-ink outline-none border-0 p-0 text-right"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {caption && <p className="mt-1.5 text-xs text-ink/50">{caption}</p>}
    </div>
  );
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function CotizadorForm() {
  const [step, setStep] = useState<Step>(1);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [leadResult, setLeadResult] = useState<{ numero_presupuesto: string } | null>(null);
  const [cotizacionFinal, setCotizacionFinal] = useState<any | null>(null);

  // Presupuesto en vivo: se recalcula a medida que el usuario completa el formulario.
  const [cotizacionLive, setCotizacionLive] = useState<any | null>(null);

  const [ambientes, setAmbientes] = useState<AmbienteRow[]>([]);

  // ── ETAPA 5D: estructura dinámica del formulario ──────────────
  const [pasosAPI, setPasosAPI] = useState<PasoAPI[]>([]);
  const [estructuraCargando, setEstructuraCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    fetch("/api/cotizador/formulario")
      .then((r) => r.json())
      .then((data) => {
        if (!vivo) return;
        if (data.ok && Array.isArray(data.pasos)) {
          setPasosAPI(data.pasos);
        } else {
          // No interrumpimos el wizard: sigue funcionando con el catálogo
          // legado vía los fallbacks de conOpciones/conFilas.
          console.warn("No se pudo cargar /api/cotizador/formulario:", data.error);
        }
      })
      .catch((err) => {
        if (vivo) console.warn("Error cargando /api/cotizador/formulario:", err);
      })
      .finally(() => {
        if (vivo) setEstructuraCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Catálogos resueltos: dinámicos si la API los trae, legados si no.
  const TIPOS_ESPACIO_R = useMemo(
    () =>
      conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.tipo_espacio), TIPOS_ESPACIO).map((o) => ({
        ...o,
        sublabel: SUBLABELS_TIPO_ESPACIO[o.value],
      })),
    [pasosAPI]
  );
  const AMBIENTES_R = useMemo(
    () => conFilas(buscarCampoPorCodigo(pasosAPI, CAMPO.tipo_ambiente), AMBIENTES),
    [pasosAPI]
  );
  const PLANTAS_OPCIONES_R = useMemo(
    () => conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.plantas), PLANTAS_OPCIONES),
    [pasosAPI]
  );
  const SUBSUELOS_OPCIONES_R = useMemo(
    () => conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.subsuelos), SUBSUELOS_OPCIONES),
    [pasosAPI]
  );
  const BARBACOA_PERSONAS_OPCIONES_R = useMemo(
    () => conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.barbacoa_personas), BARBACOA_PERSONAS_OPCIONES),
    [pasosAPI]
  );
  const TURNOS_OPCIONES_R = useMemo(
    () => conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.turnos), TURNOS_OPCIONES),
    [pasosAPI]
  );
  const FRECUENCIAS_R = useMemo(
    () => conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.frecuencia), FRECUENCIAS),
    [pasosAPI]
  );
  const CAFETERAS_R = useMemo(
    () => conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.cafetera), CAFETERAS),
    [pasosAPI]
  );
  const DISPENSADORES_R = useMemo(
    () => conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.dispensador_agua), DISPENSADORES),
    [pasosAPI]
  );
  const VAJILLA_TIPOS_R = useMemo(
    () => conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.vajilla_tipo), VAJILLA_TIPOS),
    [pasosAPI]
  );
  const VAJILLA_PLAZOS_R = useMemo(
    () => conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.vajilla_plazo), VAJILLA_PLAZOS),
    [pasosAPI]
  );
  const VAJILLA_CANTIDAD_OPCIONES_R = useMemo(
    () =>
      conOpciones(
        buscarCampoPorCodigo(pasosAPI, CAMPO.vajilla_cantidad),
        VAJILLA_CANTIDAD_OPCIONES_LEGADO
      ),
    [pasosAPI]
  );
  const LAVAVAJILLAS_TIPOS_R = useMemo(
    () => conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.lavavajillas_tipo), LAVAVAJILLAS_TIPOS),
    [pasosAPI]
  );
  const AMBIENTADORES_CANTIDADES_R = useMemo(
    () => conOpciones(buscarCampoPorCodigo(pasosAPI, CAMPO.ambientadores_cantidad), AMBIENTADORES_CANTIDADES),
    [pasosAPI]
  );

  // El `form` pasa a ser un Record indexado por código de campo dinámico
  // (en vez de un shape TS fijo). Los nombres de clave iniciales se
  // mantienen iguales a los `codigo` asumidos arriba, así que el armado
  // del payload para /api/leads (buildEstructura/buildOpcionales/
  // buildAmbientesPayload, más abajo) no cambia de forma.
  const [form, setForm] = useState<Record<string, any>>({
    tipo_espacio: "",
    plantas: "1",
    subsuelos: "0",
    barbacoa_personas: "",
    turnos: "1",
    horario: "",
    usuarios_totales: "",
    frecuencia: "2x_semana",
    vajilla_tipo: "",
    vajilla_plazo: "mes",
    vajilla_cantidad: "",
    vajilla_cantidad_personalizada: "",
    vajilla_sanitizacion: false,
    lavavajillas_tipo: "",
    cafetera: "",
    dispensador_agua: "",
    ambientadores_cantidad: "",
    insumos_cocina_bano: {} as Record<InsumoCocinaBanoKey, { nivel: string; dispensador: boolean }>,
    nombre: "",
    email: "",
    telefono: "",
    empresa: "",
  });

  function update(codigo: string, value: any) {
    setForm((f) => ({ ...f, [codigo]: value }));
  }

  // ── Manejo de la tabla de ambientes ──────────────────────────
  function addAmbiente(tipo_ambiente = "oficina") {
    setAmbientes((rows) => [
      ...rows,
      { id: newId(), tipo_ambiente, m2: "", usuarios: "", luz_natural: "", ventana: "" },
    ]);
  }

  function updateAmbiente(id: string, patch: Partial<AmbienteRow>) {
    setAmbientes((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeAmbiente(id: string) {
    setAmbientes((rows) => rows.filter((r) => r.id !== id));
  }

  const ambientesCompletos = ambientes.length > 0 && ambientes.every((a) => a.tipo_ambiente && Number(a.m2) > 0);

  function handleContinuarDesdeEspacio() {
    if (!form.tipo_espacio) {
      setErrorMsg("Elegí el tipo de comercio para continuar.");
      return;
    }
    setErrorMsg(null);
    if (ambientes.length === 0) addAmbiente();
    setStep(2);
  }

  function vajillaCantidadFinal() {
    return form.vajilla_cantidad === "personalizado"
      ? Number(form.vajilla_cantidad_personalizada)
      : Number(form.vajilla_cantidad);
  }

  function buildOpcionales() {
    const opcionales: Record<string, any> = {};
    if (form.vajilla_tipo && form.vajilla_cantidad) {
      opcionales.vajilla = {
        tipo: form.vajilla_tipo,
        cantidad: vajillaCantidadFinal(),
        plazo: form.vajilla_plazo,
      };
      if (form.vajilla_sanitizacion) opcionales.vajilla_sanitizacion_semanal = true;
    }
    if (form.lavavajillas_tipo) {
      opcionales.lavavajillas = { tipo: form.lavavajillas_tipo };
    }
    if (form.cafetera) opcionales.cafetera = form.cafetera;
    if (form.dispensador_agua) opcionales.dispensador_agua = form.dispensador_agua;
    if (form.ambientadores_cantidad) {
      opcionales.ambientadores = { cantidad: Number(form.ambientadores_cantidad) };
    }
    const insumosCocinaBano = form.insumos_cocina_bano as Record<
      InsumoCocinaBanoKey,
      { nivel: string; dispensador: boolean }
    >;
    const insumosSeleccionados = Object.entries(insumosCocinaBano).filter(([, v]) => v?.nivel);
    if (insumosSeleccionados.length) {
      opcionales.insumos_cocina_bano = Object.fromEntries(
        insumosSeleccionados.map(([key, v]) => [key, { nivel: v.nivel, incluir_dispensador: v.dispensador }])
      );
    }
    return opcionales;
  }

  function buildEstructura() {
    return {
      tipo_espacio: form.tipo_espacio,
      plantas: form.plantas,
      subsuelos: form.subsuelos,
      barbacoa_personas: form.barbacoa_personas,
      turnos: form.turnos,
      horario: form.horario,
      usuarios_totales: form.usuarios_totales,
    };
  }

  function buildAmbientesPayload() {
    return ambientes.map((a) => ({
      tipo_ambiente: a.tipo_ambiente,
      m2: Number(a.m2),
      ...(a.usuarios ? { usuarios: Number(a.usuarios) } : {}),
      ...(a.luz_natural ? { luz_natural: a.luz_natural === "si" } : {}),
      ...(a.ventana ? { ventana: a.ventana === "si" } : {}),
    }));
  }

  function setInsumoNivel(key: InsumoCocinaBanoKey, nivel: string) {
    setForm((f) => {
      const actual = f.insumos_cocina_bano[key];
      if (!nivel) {
        const { [key]: _omit, ...resto } = f.insumos_cocina_bano;
        return { ...f, insumos_cocina_bano: resto as typeof f.insumos_cocina_bano };
      }
      return {
        ...f,
        insumos_cocina_bano: {
          ...f.insumos_cocina_bano,
          [key]: { nivel, dispensador: actual?.dispensador ?? false },
        },
      };
    });
  }

  function setInsumoDispensador(key: InsumoCocinaBanoKey, dispensador: boolean) {
    setForm((f) => {
      const actual = f.insumos_cocina_bano[key];
      if (!actual) return f;
      return {
        ...f,
        insumos_cocina_bano: { ...f.insumos_cocina_bano, [key]: { ...actual, dispensador } },
      };
    });
  }

  // Ítems opcionales elegidos, para el resumen final (sin precios).
  const resumenOpcionales: { key: string; label: string; onRemove: () => void }[] = [];
  if (form.vajilla_tipo && form.vajilla_cantidad) {
    resumenOpcionales.push({
      key: "vajilla",
      label: `Vajilla ${labelFor(VAJILLA_TIPOS_R, form.vajilla_tipo)} — ${vajillaCantidadFinal() || "?"} unidades · ${labelFor(
        VAJILLA_PLAZOS_R,
        form.vajilla_plazo
      )}${form.vajilla_sanitizacion ? " · con sanitización semanal" : ""}`,
      onRemove: () => {
        update("vajilla_tipo", "");
        update("vajilla_cantidad", "");
        update("vajilla_cantidad_personalizada", "");
        update("vajilla_sanitizacion", false);
      },
    });
  }
  if (form.lavavajillas_tipo) {
    resumenOpcionales.push({
      key: "lavavajillas",
      label: `Lavavajillas — ${labelFor(LAVAVAJILLAS_TIPOS_R, form.lavavajillas_tipo)} (incluye consumibles)`,
      onRemove: () => update("lavavajillas_tipo", ""),
    });
  }
  if (form.cafetera) {
    resumenOpcionales.push({
      key: "cafetera",
      label: `Cafetera — ${labelFor(CAFETERAS_R, form.cafetera)}`,
      onRemove: () => update("cafetera", ""),
    });
  }
  if (form.dispensador_agua) {
    resumenOpcionales.push({
      key: "dispensador_agua",
      label: `Dispensador de agua — ${labelFor(DISPENSADORES_R, form.dispensador_agua)}`,
      onRemove: () => update("dispensador_agua", ""),
    });
  }
  if (form.ambientadores_cantidad) {
    resumenOpcionales.push({
      key: "ambientadores",
      label: `Ambientadores — ${form.ambientadores_cantidad} unidad(es) (incluye consumibles)`,
      onRemove: () => update("ambientadores_cantidad", ""),
    });
  }
  INSUMOS_COCINA_BANO.forEach(({ key, label }) => {
    const seleccion = form.insumos_cocina_bano[key];
    if (!seleccion?.nivel) return;
    resumenOpcionales.push({
      key: `insumo_${key}`,
      label: `${label} — ${labelFor(NIVELES_INSUMO, seleccion.nivel)}${
        seleccion.dispensador ? " · con dispensador" : ""
      }`,
      onRemove: () => setInsumoNivel(key, ""),
    });
  });

  // Recalcula el presupuesto en el servidor (sin guardar nada) cada vez que cambian
  // los ambientes, la frecuencia, la estructura o los opcionales.
  useEffect(() => {
    if (!ambientesCompletos) {
      setCotizacionLive(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/cotizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ambientes: buildAmbientesPayload(),
            frecuencia: form.frecuencia,
            estructura: buildEstructura(),
            opcionales: buildOpcionales(),
          }),
        });
        const data = await res.json();
        if (data.ok) setCotizacionLive(data.cotizacion);
      } catch {
        // Si falla el cálculo en vivo no interrumpimos el flujo del formulario.
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ambientesCompletos,
    JSON.stringify(ambientes),
    JSON.stringify(buildOpcionales()),
    form.frecuencia,
    form.tipo_espacio,
    form.plantas,
    form.subsuelos,
    form.barbacoa_personas,
    form.turnos,
    form.usuarios_totales,
  ]);

  function handleContinuarAResumen() {
    setErrorMsg(null);
    if (!form.telefono || !form.email) {
      setErrorMsg("Completá tu celular y tu email para continuar.");
      return;
    }
    setStep(5);
  }

  async function handleSubmit() {
    setErrorMsg(null);
    if (!ambientesCompletos) {
      setErrorMsg("Revisá los ambientes: falta el tipo o el metraje de alguno.");
      setStep(2);
      return;
    }
    if (!form.telefono || !form.email) {
      setErrorMsg("Completá tu celular y tu email para enviarte el presupuesto.");
      setStep(4);
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre || undefined,
          email: form.email,
          telefono: form.telefono,
          empresa: form.empresa || undefined,
          ambientes: buildAmbientesPayload(),
          frecuencia: form.frecuencia,
          estructura: buildEstructura(),
          opcionales: buildOpcionales(),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No pudimos generar tu presupuesto");
      setLeadResult(data.lead);
      setCotizacionFinal(data.cotizacion);
      setStep(6);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 2 }).format(n);
  }

  // Contenido editable del presupuesto: se usa en el paso 5 de resumen final.
  function renderResumenPresupuesto() {
    const goTo = (s: Step) => setStep(s);

    return (
      <div className="space-y-5">
        {/* Espacio */}
        <div className="rounded-xl border border-navy-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-semibold text-navy text-sm">Tu espacio</p>
            <button type="button" className="text-xs font-medium text-blue hover:underline" onClick={() => goTo(1)}>
              Editar
            </button>
          </div>
          <ul className="space-y-1.5 text-sm text-ink/80">
            <li className="flex justify-between gap-3">
              <span>Tipo</span>
              <span className="font-medium text-ink text-right">{labelFor(TIPOS_ESPACIO_R, form.tipo_espacio) || "Sin definir"}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Plantas / Subsuelos</span>
              <span className="font-medium text-ink text-right">
                {labelFor(PLANTAS_OPCIONES_R, form.plantas)} · {labelFor(SUBSUELOS_OPCIONES_R, form.subsuelos)}
              </span>
            </li>
            {form.barbacoa_personas && (
              <li className="flex justify-between gap-3">
                <span>Barbacoa</span>
                <span className="font-medium text-ink text-right">{labelFor(BARBACOA_PERSONAS_OPCIONES_R, form.barbacoa_personas)}</span>
              </li>
            )}
            <li className="flex justify-between gap-3">
              <span>Turnos</span>
              <span className="font-medium text-ink text-right">{labelFor(TURNOS_OPCIONES_R, form.turnos)}</span>
            </li>
          </ul>
        </div>

        {/* Ambientes */}
        <div className="rounded-xl border border-navy-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-semibold text-navy text-sm">Ambientes</p>
            <button type="button" className="text-xs font-medium text-blue hover:underline" onClick={() => goTo(2)}>
              + Agregar / Editar
            </button>
          </div>
          {ambientes.length === 0 ? (
            <p className="text-sm text-ink/50">Todavía no agregaste ambientes.</p>
          ) : (
            <ul className="space-y-1.5 text-sm text-ink/80">
              {ambientes.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3">
                  <span>{labelFor(AMBIENTES_R, row.tipo_ambiente)}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium text-ink">{row.m2 ? `${row.m2} m²` : "?"}</span>
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:underline shrink-0"
                      onClick={() => removeAmbiente(row.id)}
                    >
                      Eliminar
                    </button>
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-3 pt-1.5 border-t border-navy-100">
                <span>Frecuencia</span>
                <span className="font-medium text-ink text-right">{labelFor(FRECUENCIAS_R, form.frecuencia)}</span>
              </li>
            </ul>
          )}
        </div>

        {/* Opcionales */}
        <div className="rounded-xl border border-navy-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-semibold text-navy text-sm">Opcionales</p>
            <button type="button" className="text-xs font-medium text-blue hover:underline" onClick={() => goTo(3)}>
              + Agregar / Editar
            </button>
          </div>
          {resumenOpcionales.length === 0 ? (
            <p className="text-sm text-ink/50">No agregaste opcionales todavía.</p>
          ) : (
            <ul className="space-y-1.5 text-sm text-ink/80">
              {resumenOpcionales.map((op) => (
                <li key={op.key} className="flex items-center justify-between gap-3">
                  <span>{op.label}</span>
                  <button type="button" className="text-xs text-red-500 hover:underline shrink-0" onClick={op.onRemove}>
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Precio en vivo */}
        <div className="rounded-xl border border-navy-100 p-4 bg-navy-50/40">
          <p className="font-display font-semibold text-navy text-sm mb-3">Tu presupuesto</p>
          {cotizacionLive ? (
            <>
              <ul className="space-y-1.5 text-sm text-ink/80 mb-3">
                {cotizacionLive.lineas.map((l: any, i: number) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{l.concepto}</span>
                    <span className="font-medium text-ink">{formatCurrency(l.monto_mensual)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-navy-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-ink/60">
                  <span>Total por visita</span>
                  <span>{formatCurrency(cotizacionLive.total_por_visita)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-display font-semibold text-navy">Total mensual</span>
                  <span className="font-display font-bold text-2xl text-orange">
                    {formatCurrency(cotizacionLive.total_mensual)}
                  </span>
                </div>
              </div>
              <div className="mt-3 bg-orange-50 rounded-xl p-3 text-xs text-navy font-medium">
                🎁 Incluye {cotizacionLive.regalo_bienvenida.descripcion} de regalo al contratar.
              </div>
            </>
          ) : (
            <p className="text-sm text-ink/50">
              Completá al menos un ambiente (tipo + m²) para ver el precio calculado.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ETAPA 5D: loading state mientras se resuelve la estructura del wizard
  // (un solo fetch a /api/cotizador/formulario al montar). Una vez resuelto
  // (éxito o error), el wizard se muestra igual que antes — si la API
  // falló, simplemente usa los catálogos legados vía los fallbacks.
  if (estructuraCargando) {
    return (
      <div className="grid lg:grid-cols-[minmax(0,640px)_360px] gap-8 items-start justify-center max-w-5xl mx-auto">
        <Card className="w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-1.5 w-full rounded-full bg-navy-100" />
            <div className="h-6 w-2/3 rounded bg-navy-100" />
            <div className="h-4 w-full rounded bg-navy-100" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-navy-100" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,640px)_360px] gap-8 items-start justify-center max-w-5xl mx-auto">
      <Card className="animate-fadeUp w-full">
        {/* Progreso */}
        {step < 6 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-orange" : "bg-navy-100"
                }`}
              />
            ))}
          </div>
        )}

        {step < 5 && cotizacionLive && (
          <div className="lg:hidden w-full flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 mb-6 text-sm font-medium text-navy">
            <span>Ver mi presupuesto</span>
            <span className="font-display font-bold text-orange">{formatCurrency(cotizacionLive.total_mensual)}/mes →</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-display font-semibold text-xl text-navy">1. ¿Qué tipo de espacio es?</h2>
            <p className="text-sm text-ink/60 -mt-2">
              Elegí la categoría que mejor describe tu espacio. Después vas a poder sumar todos
              los ambientes que necesites.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TIPOS_ESPACIO_R.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update("tipo_espacio", t.value)}
                  className={`rounded-xl border px-4 py-5 text-sm font-medium text-center transition-colors ${
                    form.tipo_espacio === t.value
                      ? "border-orange bg-orange-50 text-navy"
                      : "border-navy-100 text-navy hover:border-orange hover:bg-orange-50"
                  }`}
                >
                  <span className="block">{t.label}</span>
                  {t.sublabel && <span className="block text-xs text-ink/50">{t.sublabel}</span>}
                </button>
              ))}
            </div>

            {form.tipo_espacio && (
              <div className="space-y-4 pt-2 animate-fadeUp">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <BoxSelect
                    label="Turnos"
                    value={form.turnos}
                    onChange={(e) => update("turnos", e.target.value)}
                    options={TURNOS_OPCIONES_R}
                  />
                  <BoxInput
                    label="Horario"
                    placeholder="Ej: 09:00 a 18:00"
                    value={form.horario}
                    onChange={(e) => update("horario", e.target.value)}
                  />
                  <BoxInput
                    label="Usuarios"
                    type="number"
                    min={0}
                    placeholder="Ej: 40"
                    value={form.usuarios_totales}
                    onChange={(e) => update("usuarios_totales", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <BoxSelect
                    label="Plantas"
                    value={form.plantas}
                    onChange={(e) => update("plantas", e.target.value)}
                    options={PLANTAS_OPCIONES_R}
                  />
                  <BoxSelect
                    label="Subsuelos"
                    value={form.subsuelos}
                    onChange={(e) => update("subsuelos", e.target.value)}
                    options={SUBSUELOS_OPCIONES_R}
                  />
                  <BoxSelect
                    label="Barbacoas"
                    value={form.barbacoa_personas}
                    onChange={(e) => update("barbacoa_personas", e.target.value)}
                    options={BARBACOA_PERSONAS_OPCIONES_R}
                  />
                </div>
              </div>
            )}

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

            <div className="pt-2 flex justify-end">
              <Button onClick={handleContinuarDesdeEspacio}>Siguiente →</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display font-semibold text-xl text-navy">2. Contanos tu espacio</h2>
            <p className="text-sm text-ink/60 -mt-2">
              Agregá todos los ambientes que necesites cotizar, con su metraje.
            </p>

            <div className="space-y-3">
              {ambientes.map((row) => (
                <div key={row.id} className="rounded-xl border border-navy-100 p-3">
                  <div className="flex items-start gap-2">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1">
                      <BoxSelect
                        label="Ambiente"
                        value={row.tipo_ambiente}
                        onChange={(e) => updateAmbiente(row.id, { tipo_ambiente: e.target.value })}
                        options={AMBIENTES_R}
                      />
                      <BoxInput
                        label="Metraje (m²)"
                        type="number"
                        min={1}
                        placeholder="Ej: 40"
                        value={row.m2}
                        onChange={(e) => updateAmbiente(row.id, { m2: e.target.value })}
                      />
                      <BoxInput
                        label="Usuarios"
                        type="number"
                        min={0}
                        placeholder="Ej: 5"
                        value={row.usuarios}
                        onChange={(e) => updateAmbiente(row.id, { usuarios: e.target.value })}
                      />
                      <BoxSelect
                        label="Luz natural"
                        value={row.luz_natural}
                        onChange={(e) => updateAmbiente(row.id, { luz_natural: e.target.value })}
                        options={[{ value: "", label: "—" }, ...SI_NO_OPCIONES]}
                      />
                      <BoxSelect
                        label="Ventana"
                        value={row.ventana}
                        onChange={(e) => updateAmbiente(row.id, { ventana: e.target.value })}
                        options={[{ value: "", label: "—" }, ...SI_NO_OPCIONES]}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label="Quitar ambiente"
                      onClick={() => removeAmbiente(row.id)}
                      className="text-ink/40 hover:text-red-500 transition-colors text-lg leading-none px-1 pt-2"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {ambientes.length === 0 && (
              <p className="text-sm text-ink/50">Todavía no agregaste ningún ambiente.</p>
            )}

            <button
              type="button"
              onClick={() => addAmbiente(ambientes[ambientes.length - 1]?.tipo_ambiente)}
              className="text-sm font-medium text-blue hover:underline"
            >
              + Agregar ambiente
            </button>

            <div className="pt-2">
              <Select
                label="Frecuencia de visita"
                options={FRECUENCIAS_R}
                value={form.frecuencia}
                onChange={(e) => update("frecuencia", e.target.value)}
              />
            </div>

            <div className="pt-2 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>← Atrás</Button>
              <Button onClick={() => setStep(3)} disabled={!ambientesCompletos}>Siguiente →</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-display font-semibold text-xl text-navy">3. Sumá opcionales</h2>

            <div>
              <p className="text-sm font-medium text-navy mb-2">Vajilla</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <BoxSelect
                  label="Tipo"
                  value={form.vajilla_tipo}
                  onChange={(e) => update("vajilla_tipo", e.target.value)}
                  options={VAJILLA_TIPOS_R}
                />
                <BoxSelect
                  label="Plazo"
                  value={form.vajilla_plazo}
                  onChange={(e) => update("vajilla_plazo", e.target.value)}
                  options={VAJILLA_PLAZOS_R}
                />
                <BoxSelect
                  label="Cantidad"
                  value={form.vajilla_cantidad}
                  onChange={(e) => update("vajilla_cantidad", e.target.value)}
                  options={VAJILLA_CANTIDAD_OPCIONES_R}
                />
              </div>
              {form.vajilla_cantidad === "personalizado" && (
                <div className="mt-2">
                  <BoxInput
                    label="Cantidad exacta"
                    type="number"
                    min={1}
                    value={form.vajilla_cantidad_personalizada}
                    onChange={(e) => update("vajilla_cantidad_personalizada", e.target.value)}
                  />
                </div>
              )}
              {form.vajilla_tipo && (
                <label className="flex items-center gap-2 text-sm text-ink cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={form.vajilla_sanitizacion}
                    onChange={(e) => update("vajilla_sanitizacion", e.target.checked)}
                    className="rounded border-navy-100 text-orange focus:ring-orange/30"
                  />
                  Incluir sanitización semanal de vajilla
                </label>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="Cafetera"
                options={CAFETERAS_R}
                value={form.cafetera}
                onChange={(e) => update("cafetera", e.target.value)}
              />
              <Select
                label="Dispensador de agua"
                options={DISPENSADORES_R}
                value={form.dispensador_agua}
                onChange={(e) => update("dispensador_agua", e.target.value)}
              />
            </div>

            <InlineSelect
              label="Lavavajillas"
              options={LAVAVAJILLAS_TIPOS_R}
              value={form.lavavajillas_tipo}
              onChange={(e) => update("lavavajillas_tipo", e.target.value)}
              caption={form.lavavajillas_tipo ? "Incluyen consumibles" : undefined}
            />

            <InlineSelect
              label="Ambientadores"
              options={AMBIENTADORES_CANTIDADES_R}
              value={form.ambientadores_cantidad}
              onChange={(e) => update("ambientadores_cantidad", e.target.value)}
              caption={form.ambientadores_cantidad ? "Incluyen consumibles" : undefined}
            />

            <div>
              <p className="text-sm font-medium text-navy mb-2">Insumos Cocina & Baño</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {INSUMOS_COCINA_BANO.map(({ key, label }) => {
                  const seleccion = form.insumos_cocina_bano[key];
                  return (
                    <div key={key}>
                      <Select
                        label={label}
                        options={[{ value: "", label: `Sin ${label.toLowerCase()}` }, ...NIVELES_INSUMO]}
                        value={seleccion?.nivel ?? ""}
                        onChange={(e) => setInsumoNivel(key, e.target.value)}
                      />
                      {seleccion?.nivel && (
                        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer mt-2">
                          <input
                            type="checkbox"
                            checked={seleccion.dispensador}
                            onChange={(e) => setInsumoDispensador(key, e.target.checked)}
                            className="rounded border-navy-100 text-orange focus:ring-orange/30"
                          />
                          Incluir dispensador
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>← Atrás</Button>
              <Button onClick={() => setStep(4)}>Siguiente →</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-display font-semibold text-xl text-navy">4. Tus datos de contacto</h2>
            <p className="text-sm text-ink/60 -mt-2">Solo necesitamos tu celular y tu email para enviarte el presupuesto.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Celular" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} required />
              <Input label="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
              <Input label="Nombre (opcional)" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} />
              <Input label="Empresa (opcional)" value={form.empresa} onChange={(e) => update("empresa", e.target.value)} />
            </div>
            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            <div className="pt-2 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}>← Atrás</Button>
              <Button onClick={handleContinuarAResumen}>
                Revisar resumen →
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <h2 className="font-display font-semibold text-xl text-navy">5. Revisá tu selección</h2>
            <p className="text-sm text-ink/60 -mt-2">
              Confirmá los datos antes de enviar. Podés editar o quitar lo que quieras.
            </p>

            {renderResumenPresupuesto()}

            {/* Contacto */}
            <div className="rounded-xl border border-navy-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display font-semibold text-navy text-sm">Tus datos</p>
                <button type="button" className="text-xs font-medium text-blue hover:underline" onClick={() => setStep(4)}>
                  Editar
                </button>
              </div>
              <ul className="space-y-1.5 text-sm text-ink/80">
                <li className="flex justify-between gap-3">
                  <span>Celular</span>
                  <span className="font-medium text-ink text-right">{form.telefono}</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Email</span>
                  <span className="font-medium text-ink text-right">{form.email}</span>
                </li>
                {form.nombre && (
                  <li className="flex justify-between gap-3">
                    <span>Nombre</span>
                    <span className="font-medium text-ink text-right">{form.nombre}</span>
                  </li>
                )}
                {form.empresa && (
                  <li className="flex justify-between gap-3">
                    <span>Empresa</span>
                    <span className="font-medium text-ink text-right">{form.empresa}</span>
                  </li>
                )}
              </ul>
            </div>

            <p className="text-xs text-ink/50">
              El presupuesto detallado, con precios y el regalo de bienvenida, te lo enviamos por email.
            </p>

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

            <div className="pt-2 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(4)}>← Atrás</Button>
              <Button onClick={handleSubmit} loading={enviando}>
                Confirmar y enviarme el presupuesto
              </Button>
            </div>
          </div>
        )}

        {step === 6 && leadResult && cotizacionFinal && (
          <div className="space-y-6 animate-fadeUp">
            <div className="text-center space-y-2">
              <div className="text-5xl">✅</div>
              <h2 className="font-display font-bold text-2xl text-navy">¡Presupuesto enviado!</h2>
              <p className="text-ink/70 max-w-sm mx-auto">
                Te enviamos el presupuesto <strong>{leadResult.numero_presupuesto}</strong> a{" "}
                <strong>{form.email}</strong>, junto con tu regalo de bienvenida.
              </p>
            </div>

            <div className="rounded-xl border border-navy-100 p-4 bg-navy-50/40">
              <p className="font-display font-semibold text-navy text-sm mb-3">
                Presupuesto {leadResult.numero_presupuesto}
              </p>
              <ul className="space-y-1.5 text-sm text-ink/80 mb-3">
                {cotizacionFinal.lineas.map((l: any, i: number) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{l.concepto}</span>
                    <span className="font-medium text-ink">{formatCurrency(l.monto_mensual)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-navy-100 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-ink/70">
                  <span>Total por visita</span>
                  <span>{formatCurrency(cotizacionFinal.total_por_visita)}</span>
                </div>
                <div className="flex justify-between font-semibold text-navy">
                  <span>Total mensual</span>
                  <span className="text-orange">{formatCurrency(cotizacionFinal.total_mensual)}</span>
                </div>
              </div>
              <p className="text-xs text-ink/50 mt-3">
                🎁 Regalo de bienvenida: {cotizacionFinal.regalo_bienvenida.descripcion}
              </p>
            </div>
          </div>
        )}
      </Card>

      <div className="hidden lg:block sticky top-24">
        <PriceSummary cotizacion={cotizacionLive} />
      </div>
    </div>
  );
}
