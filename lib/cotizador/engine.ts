/**
 * Motor de cálculo del Cotizador FACILIA (configurable, sin valores
 * hardcodeados). Todo lo que puede variar entre presupuestos (factores por
 * tipo de ambiente, factores de frecuencia, precio base por m², margen
 * comercial, adicionales) viene de la base de datos vía
 * `cargarConfiguracion()`; este archivo solo hace el cálculo.
 *
 * Este motor es independiente del legacy `lib/calculatePrice.ts` (que sigue
 * siendo el que usa hoy el cotizador público) — conviven hasta que una
 * etapa futura migre `components/CotizadorForm.tsx` a este motor.
 */

// ── Tipos de entrada ────────────────────────────────────────────

export interface AmbienteInputCalc {
  /** Código de la opción de la variable TIPO_AMBIENTE, ej: "OFICINA" */
  tipo: string;
  m2: number;
}

export interface CotizacionInput {
  ambientes: AmbienteInputCalc[];
  /** Código de la opción de la variable FRECUENCIA, ej: "3X_SEMANA" */
  frecuencia: string;
  /** Códigos de cotizador_extras a incluir en el presupuesto */
  extras?: string[];
}

// ── Configuración cargada desde Supabase ───────────────────────

export interface OpcionCotizador {
  id: string;
  nombre: string;
  codigo: string;
  factor: number;
  precio_fijo: number | null;
  activo: boolean;
}

export interface VariableCotizador {
  id: string;
  nombre: string;
  codigo: string;
  tipo: string;
  activo: boolean;
  opciones: OpcionCotizador[];
}

export interface ExtraCotizador {
  id: string;
  nombre: string;
  codigo: string;
  tipo_calculo: "fixed" | "percentage" | "formula";
  valor: number;
  activo: boolean;
}

export interface CotizadorConfig {
  variables: VariableCotizador[];
  parametros: Record<string, number>;
  extras: ExtraCotizador[];
}

// ── Resultado ────────────────────────────────────────────────────

export interface LineaDetalle {
  concepto: string;
  cantidad?: number;
  factor?: number;
  monto: number;
}

export interface CotizacionResultado {
  superficie_ponderada: number;
  costo_mensual: number;
  precio_mensual: number;
  margen_aplicado: number;
  detalle: LineaDetalle[];
}

// ── Helpers internos ─────────────────────────────────────────────

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

function buscarVariable(config: CotizadorConfig, codigoVariable: string): VariableCotizador {
  const variable = config.variables.find((v) => v.codigo === codigoVariable);
  if (!variable || !variable.activo) {
    throw new Error(`Variable de cotizador desconocida o inactiva: ${codigoVariable}`);
  }
  return variable;
}

function buscarOpcion(variable: VariableCotizador, codigoOpcion: string): OpcionCotizador {
  const opcion = variable.opciones.find((o) => o.codigo === codigoOpcion);
  if (!opcion || !opcion.activo) {
    throw new Error(
      `Opción "${codigoOpcion}" desconocida o inactiva para la variable "${variable.codigo}"`
    );
  }
  return opcion;
}

function requerirParametro(config: CotizadorConfig, clave: string): number {
  const valor = config.parametros[clave];
  if (valor === undefined || valor === null || Number.isNaN(valor)) {
    throw new Error(`Falta el parámetro obligatorio "${clave}" en cotizador_config`);
  }
  return valor;
}

// ── Motor puro ───────────────────────────────────────────────────

/**
 * Calcula un presupuesto a partir de un input y una configuración ya
 * cargada. No hace fetch: es una función pura, fácil de testear.
 */
export function calcularCotizacion(
  input: CotizacionInput,
  config: CotizadorConfig
): CotizacionResultado {
  if (!input.ambientes || input.ambientes.length === 0) {
    throw new Error("Agregá al menos un ambiente para cotizar");
  }

  const detalle: LineaDetalle[] = [];

  const precioM2Base = requerirParametro(config, "PRECIO_M2_BASE");
  const margenComercial = requerirParametro(config, "MARGEN_COMERCIAL");

  // ── 1. Superficie ponderada: suma de m2 × factor de tipo de ambiente ──
  const variableAmbiente = buscarVariable(config, "TIPO_AMBIENTE");

  let superficiePonderada = 0;
  input.ambientes.forEach((a, idx) => {
    if (!a.m2 || a.m2 <= 0) {
      throw new Error(`Superficie inválida para el ambiente #${idx + 1}`);
    }
    const opcionAmbiente = buscarOpcion(variableAmbiente, a.tipo);
    const ponderado = a.m2 * opcionAmbiente.factor;
    superficiePonderada += ponderado;

    detalle.push({
      concepto: `${opcionAmbiente.nombre} (${a.m2} m²)`,
      cantidad: a.m2,
      factor: opcionAmbiente.factor,
      monto: redondear(ponderado),
    });
  });

  // ── 2. Base según precio por m² ────────────────────────────────
  const base = superficiePonderada * precioM2Base;

  // ── 3. Frecuencia ───────────────────────────────────────────────
  const variableFrecuencia = buscarVariable(config, "FRECUENCIA");
  const opcionFrecuencia = buscarOpcion(variableFrecuencia, input.frecuencia);
  const factorFrecuencia = opcionFrecuencia.factor;

  let costoMensual = base * factorFrecuencia;

  detalle.push({
    concepto: `Frecuencia: ${opcionFrecuencia.nombre}`,
    factor: factorFrecuencia,
    monto: redondear(costoMensual),
  });

  // ── 4. Extras ────────────────────────────────────────────────────
  for (const codigoExtra of input.extras ?? []) {
    const extra = config.extras.find((e) => e.codigo === codigoExtra);
    if (!extra || !extra.activo) {
      throw new Error(`Extra desconocido o inactivo: ${codigoExtra}`);
    }

    let montoExtra: number;
    if (extra.tipo_calculo === "fixed") {
      montoExtra = extra.valor;
    } else if (extra.tipo_calculo === "percentage") {
      montoExtra = costoMensual * (extra.valor / 100);
    } else {
      throw new Error(
        `El extra "${extra.codigo}" usa tipo_calculo "formula", todavía no implementado`
      );
    }

    costoMensual += montoExtra;
    detalle.push({
      concepto: `Adicional: ${extra.nombre}`,
      monto: redondear(montoExtra),
    });
  }

  // ── 5. Margen comercial ──────────────────────────────────────────
  const precioMensual = costoMensual * (1 + margenComercial / 100);
  const montoMargen = precioMensual - costoMensual;

  detalle.push({
    concepto: `Margen comercial (${margenComercial}%)`,
    factor: margenComercial,
    monto: redondear(montoMargen),
  });

  return {
    superficie_ponderada: redondear(superficiePonderada),
    costo_mensual: redondear(costoMensual),
    precio_mensual: redondear(precioMensual),
    margen_aplicado: margenComercial,
    detalle,
  };
}

/**
 * Conveniencia: carga la configuración activa desde Supabase y calcula en
 * un solo paso. Server-side only (importa el repositorio, que usa la
 * Service Role Key) — usar directo desde API routes, no desde componentes
 * de cliente.
 */
export async function calcularCotizacionDesdeDB(
  input: CotizacionInput
): Promise<CotizacionResultado> {
  // Import diferido para evitar el ciclo estático engine.ts <-> repository.ts
  // (repository.ts importa tipos de engine.ts).
  const { cargarConfiguracion } = await import("./repository");
  const config = await cargarConfiguracion();
  return calcularCotizacion(input, config);
}
