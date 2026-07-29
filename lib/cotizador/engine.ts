/**
 * Motor de cálculo del Cotizador FACILIA (configurable, sin valores
 * hardcodeados). Todo lo que puede variar entre presupuestos (rendimiento
 * y costo de insumos por tipo de ambiente, visitas por frecuencia, costo
 * de hora de operario, margen comercial, adicionales, opcionales) viene
 * de la base de datos vía `cargarConfiguracion()`; este archivo solo hace
 * el cálculo.
 *
 * ── Etapa 5D-bis: modelo de costo real ────────────────────────────────
 * Ver comentario histórico más abajo, sin cambios en esta etapa.
 *
 *   costo_ambiente_por_visita = (m2 / rendimiento_m2_hora) × HORA_OPERARIO
 *                                + m2 × insumos_m2
 *   costo_ambiente_mensual    = frecuencia_independiente
 *                                 ? costo_ambiente_por_visita   (tarifa fija, no depende de visitas)
 *                                 : costo_ambiente_por_visita × visitas_mes
 *   costo_mensual             = Σ costo_ambiente_mensual (todos los ambientes)
 *                                + Σ opcionales + Σ adicionales (extras)
 *   precio_mensual            = costo_mensual × (1 + MARGEN_COMERCIAL / 100)
 *
 * `rendimiento_m2_hora`, `insumos_m2` y `frecuencia_independiente` viven en
 * cotizador_opciones (solo tienen sentido en opciones de TIPO_AMBIENTE).
 * `visitas_mes` vive en cotizador_opciones (solo en opciones de FRECUENCIA).
 * `HORA_OPERARIO` y `MARGEN_COMERCIAL` viven en cotizador_config.
 * Ver supabase/migrations/2026_07_28_etapa5D_bis_motor_costo.sql.
 *
 * ── Etapa 5G: opcionales (vajilla, lavavajillas, cafetera, dispensador
 * de agua, ambientadores, insumos de cocina/baño) ──────────────────────
 * Se modelan como cotizador_variables (mismo patrón que TIPO_AMBIENTE),
 * no como cotizador_extras, porque necesitan una noción de "cantidad" que
 * los extras no tienen. Cada variable de opcional trae `cantidad_fuente`:
 *
 *   'ninguna'        → precio = opcion.precio_fijo (cantidad implícita = 1)
 *   'input_cliente'  → precio = opcion.precio_fijo × cantidad (la manda el cliente)
 *   'cantidad_banos' → precio = opcion.precio_fijo × cantidad de ambientes
 *                       con tipo "BANO" en el presupuesto (mínimo 1, igual
 *                       que hacía el motor legado con `banosCount`)
 *
 * Ver supabase/migrations/2026_07_28_etapa5G_opcionales_variables.sql.
 * Los add-ons fijos de cada opcional (sanitización de vajilla, "incluir
 * dispensador" de cada insumo) siguen viviendo en cotizador_extras — se
 * seleccionan igual que cualquier otro extra, vía `input.extras`.
 *
 * ⚠️ Los valores de rendimiento/insumos/precio_fijo de opcionales cargados
 * por las migraciones de 5D-bis y 5G son PLACEHOLDERS marcados "a
 * confirmar con FACILIA" — el motor calcula correctamente con cualquier
 * valor que tengan esas columnas, pero el precio resultante no es
 * confiable para cobrar hasta que alguien de FACILIA con visibilidad de
 * costos reales los revise.
 *
 * Este motor sigue siendo independiente del legacy `lib/calculatePrice.ts`
 * (que sigue siendo el que usa hoy el cotizador público) — conviven en
 * modo shadow hasta que una etapa futura, con los precios ya aprobados,
 * migre `components/CotizadorForm.tsx` / `app/api/leads` a este motor.
 */

// ── Tipos de entrada ────────────────────────────────────────────

export interface AmbienteInputCalc {
  /** Código de la opción de la variable TIPO_AMBIENTE, ej: "OFICINA" */
  tipo: string;
  m2: number;
}

/**
 * Una selección de opcional hecha por el cliente en el wizard.
 * `cantidad` solo es necesaria (y se valida) cuando la variable
 * correspondiente tiene `cantidad_fuente === 'input_cliente'`
 * (ej: VAJILLA_TIPO → cantidad de personas, AMBIENTADORES → cantidad de
 * unidades). Para el resto se ignora si viene.
 */
export interface OpcionalSeleccionado {
  /** Código de la variable, ej: "VAJILLA_TIPO" */
  variable_codigo: string;
  /** Código de la opción elegida dentro de esa variable, ej: "PREMIUM" */
  opcion_codigo: string;
  cantidad?: number;
}

export interface CotizacionInput {
  ambientes: AmbienteInputCalc[];
  /** Código de la opción de la variable FRECUENCIA, ej: "3X_SEMANA" */
  frecuencia: string;
  /** Códigos de cotizador_extras a incluir en el presupuesto */
  extras?: string[];
  /** Opcionales (vajilla, cafetera, insumos, etc.) elegidos por el cliente */
  opcionales?: OpcionalSeleccionado[];
}

// ── Configuración cargada desde Supabase ───────────────────────

export interface OpcionCotizador {
  id: string;
  nombre: string;
  codigo: string;
  factor: number;
  precio_fijo: number | null;
  activo: boolean;
  /** Solo relevante en opciones de TIPO_AMBIENTE. */
  rendimiento_m2_hora: number | null;
  /** Solo relevante en opciones de TIPO_AMBIENTE. */
  insumos_m2: number | null;
  /** Solo relevante en opciones de TIPO_AMBIENTE. */
  frecuencia_independiente: boolean;
  /** Solo relevante en opciones de FRECUENCIA. */
  visitas_mes: number | null;
}

/** Cómo se determina la cantidad que multiplica a `precio_fijo` en una
 *  variable de tipo opcional. Ver comentario de cabecera — Etapa 5G. */
export type CantidadFuente = "ninguna" | "input_cliente" | "cantidad_banos";

export interface VariableCotizador {
  id: string;
  nombre: string;
  codigo: string;
  tipo: string;
  activo: boolean;
  opciones: OpcionCotizador[];
  cantidad_fuente: CantidadFuente;
  unidad_cantidad: string | null;
  cantidad_min: number | null;
  cantidad_max: number | null;
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
  /** Suma de los costos por visita/mes de todos los ambientes + opcionales + extras, antes de margen. */
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

function buscarVariableOpcional(
  config: CotizadorConfig,
  codigoVariable: string
): VariableCotizador | null {
  const variable = config.variables.find((v) => v.codigo === codigoVariable);
  if (!variable || !variable.activo) return null;
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

function requerirNumero(valor: number | null, campo: string, contexto: string): number {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    throw new Error(
      `Falta cargar "${campo}" para ${contexto} en cotizador_opciones — no se puede calcular el costo sin ese dato.`
    );
  }
  return valor;
}

/** Cuenta ambientes de tipo BANO en el presupuesto, mínimo 1 — mismo
 *  criterio que usaba `banosCount` en el motor legado (lib/calculatePrice.ts). */
function contarBanos(ambientes: AmbienteInputCalc[]): number {
  const count = ambientes.filter((a) => a.tipo === "BANO").length;
  return Math.max(1, count);
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

  const horaOperario = requerirParametro(config, "HORA_OPERARIO");
  const margenComercial = requerirParametro(config, "MARGEN_COMERCIAL");

  const variableAmbiente = buscarVariable(config, "TIPO_AMBIENTE");
  const variableFrecuencia = buscarVariable(config, "FRECUENCIA");
  const opcionFrecuencia = buscarOpcion(variableFrecuencia, input.frecuencia);
  const visitasMes = requerirNumero(
    opcionFrecuencia.visitas_mes,
    "visitas_mes",
    `la frecuencia "${opcionFrecuencia.codigo}"`
  );

  // ── 1. Costo mensual por ambiente: mano de obra (según rendimiento) + insumos ──
  let costoMensual = 0;
  input.ambientes.forEach((a, idx) => {
    if (!a.m2 || a.m2 <= 0) {
      throw new Error(`Superficie inválida para el ambiente #${idx + 1}`);
    }
    const opcionAmbiente = buscarOpcion(variableAmbiente, a.tipo);
    const rendimiento = requerirNumero(
      opcionAmbiente.rendimiento_m2_hora,
      "rendimiento_m2_hora",
      `el tipo de ambiente "${opcionAmbiente.codigo}"`
    );
    const insumosM2 = requerirNumero(
      opcionAmbiente.insumos_m2,
      "insumos_m2",
      `el tipo de ambiente "${opcionAmbiente.codigo}"`
    );

    const costoManoObraVisita = (a.m2 / rendimiento) * horaOperario;
    const costoInsumosVisita = a.m2 * insumosM2;
    const costoPorVisita = costoManoObraVisita + costoInsumosVisita;

    const costoAmbienteMensual = opcionAmbiente.frecuencia_independiente
      ? costoPorVisita
      : costoPorVisita * visitasMes;

    costoMensual += costoAmbienteMensual;

    detalle.push({
      concepto: opcionAmbiente.frecuencia_independiente
        ? `${opcionAmbiente.nombre} (${a.m2} m², tarifa fija mensual)`
        : `${opcionAmbiente.nombre} (${a.m2} m², ${visitasMes} visitas/mes)`,
      cantidad: a.m2,
      monto: redondear(costoAmbienteMensual),
    });
  });

  detalle.push({
    concepto: `Frecuencia: ${opcionFrecuencia.nombre} (${visitasMes} visitas/mes)`,
    monto: 0,
  });

  // ── 2. Opcionales (Etapa 5G) — vajilla, lavavajillas, cafetera, ─────
  //      dispensador de agua, ambientadores, insumos de cocina/baño.
  //      Se aplican una vez por presupuesto (no por ambiente).
  for (const seleccion of input.opcionales ?? []) {
    const variable = buscarVariableOpcional(config, seleccion.variable_codigo);
    if (!variable) {
      throw new Error(`Opcional desconocido o inactivo: ${seleccion.variable_codigo}`);
    }
    const opcion = buscarOpcion(variable, seleccion.opcion_codigo);
    const precioUnitario = requerirNumero(
      opcion.precio_fijo,
      "precio_fijo",
      `la opción "${opcion.codigo}" de "${variable.codigo}"`
    );

    let cantidad: number;
    let etiquetaCantidad = "";
    if (variable.cantidad_fuente === "input_cliente") {
      if (
        seleccion.cantidad === undefined ||
        seleccion.cantidad === null ||
        Number.isNaN(seleccion.cantidad) ||
        seleccion.cantidad <= 0
      ) {
        throw new Error(
          `Falta indicar la cantidad (${variable.unidad_cantidad ?? "unidades"}) para "${variable.codigo}"`
        );
      }
      if (variable.cantidad_min !== null && seleccion.cantidad < variable.cantidad_min) {
        throw new Error(`La cantidad mínima para "${variable.codigo}" es ${variable.cantidad_min}`);
      }
      if (variable.cantidad_max !== null && seleccion.cantidad > variable.cantidad_max) {
        throw new Error(`La cantidad máxima para "${variable.codigo}" es ${variable.cantidad_max}`);
      }
      cantidad = seleccion.cantidad;
      etiquetaCantidad = ` (${cantidad} ${variable.unidad_cantidad ?? "unidades"})`;
    } else if (variable.cantidad_fuente === "cantidad_banos") {
      cantidad = contarBanos(input.ambientes);
      etiquetaCantidad = ` (x${cantidad} baño/s)`;
    } else {
      cantidad = 1;
    }

    const monto = redondear(precioUnitario * cantidad);
    costoMensual += monto;
    detalle.push({
      concepto: `${variable.nombre} — ${opcion.nombre}${etiquetaCantidad}`,
      cantidad,
      monto,
    });
  }

  // ── 3. Extras ────────────────────────────────────────────────────
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

  // ── 4. Margen comercial ──────────────────────────────────────────
  const precioMensual = costoMensual * (1 + margenComercial / 100);
  const montoMargen = precioMensual - costoMensual;

  detalle.push({
    concepto: `Margen comercial (${margenComercial}%)`,
    factor: margenComercial,
    monto: redondear(montoMargen),
  });

  return {
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
