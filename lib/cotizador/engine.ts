/**
 * Motor de cálculo del Cotizador FACILIA (configurable, sin valores
 * hardcodeados). Todo lo que puede variar entre presupuestos (rendimiento
 * y costo de insumos por tipo de ambiente, visitas por frecuencia, costo
 * de hora de operario, margen comercial, adicionales, opcionales) viene
 * de la base de datos vía `cargarConfiguracion()`; este archivo solo hace
 * el cálculo.
 *
 * ── Etapa 5D-bis: modelo de costo real ────────────────────────────────
 * Sin cambios en esta etapa. Ver supabase/migrations/2026_07_28_etapa5D_bis_motor_costo.sql.
 *
 * ── Etapa 5G: opcionales (vajilla, lavavajillas, cafetera, dispensador
 * de agua, ambientadores, insumos de cocina/baño) ──────────────────────
 * Se modelan como cotizador_variables, con `cantidad_fuente`:
 *
 *   'ninguna'        → precio = opcion.precio_fijo (cantidad implícita = 1)
 *   'input_cliente'  → precio = opcion.precio_fijo × cantidad (la manda el cliente)
 *   'cantidad_banos' → precio = opcion.precio_fijo × cantidad de ambientes
 *                       con tipo "BANO" en el presupuesto (mínimo 1, igual
 *                       que hacía el motor legado con `banosCount`)
 *
 * ── Etapa 5J: cantidad_fuente avanzada ────────────────────────────────
 * Dos patrones nuevos, sin tocar los de 5G:
 *
 *   'por_tipo_ambiente'   → precio = opcion.precio_fijo × Σ (cantidad de
 *                           ambientes de cada tipo en el presupuesto ×
 *                           multiplicador de ese tipo para esta variable).
 *                           Los multiplicadores viven en
 *                           cotizador_variable_multiplicadores (uniformes
 *                           por variable, no varían por opción elegida).
 *                           A diferencia de 'cantidad_banos', NO fuerza
 *                           mínimo 1: si el presupuesto no tiene ningún
 *                           ambiente de los tipos con multiplicador
 *                           definido, cantidad = 0 y la línea no se cobra.
 *
 *   'igual_a_otra_opcion' → precio = opcion.precio_fijo × (cantidad ya
 *                           resuelta de la variable referenciada en
 *                           cantidad_referencia_variable_codigo) ×
 *                           cantidad_referencia_multiplicador. Si el
 *                           cliente no seleccionó esa otra variable en
 *                           `input.opcionales`, cantidad = 0 (no se cobra
 *                           esta línea). El motor resuelve primero todos
 *                           los opcionales independientes y recién
 *                           después los que dependen de otro, sin
 *                           importar el orden en que vengan en el input.
 *
 * Ver supabase/migrations/2026_07_28_etapa5G_opcionales_variables.sql y
 * supabase/migrations/2026_07_30_etapa5J_cantidad_avanzada.sql.
 * Los add-ons fijos de cada opcional (sanitización de vajilla, "incluir
 * dispensador" de cada insumo) siguen viviendo en cotizador_extras — se
 * seleccionan igual que cualquier otro extra, vía `input.extras`.
 *
 * ⚠️ Los valores de rendimiento/insumos/precio_fijo de opcionales cargados
 * por las migraciones de 5D-bis y 5G son PLACEHOLDERS marcados "a
 * confirmar con FACILIA" — el motor calcula correctamente con cualquier
 * valor que tengan esas columnas, pero el precio resultante no es
 * confiable para cobrar hasta que alguien de FACILIA con visibilidad de
 * costos reales los revise. Lo mismo aplica a los multiplicadores de
 * Etapa 5J (ver seed comentado en su migración).
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
 *  variable de tipo opcional. Ver comentario de cabecera — Etapas 5G/5J. */
export type CantidadFuente =
  | "ninguna"
  | "input_cliente"
  | "cantidad_banos"
  | "por_tipo_ambiente"
  | "igual_a_otra_opcion";

/** Multiplicador de cantidad_fuente='por_tipo_ambiente' para un tipo de
 *  ambiente puntual. Ver cotizador_variable_multiplicadores. */
export interface MultiplicadorTipoAmbiente {
  tipo_ambiente_codigo: string;
  multiplicador: number;
}

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
  /** Solo relevante si cantidad_fuente === 'por_tipo_ambiente'. */
  multiplicadores: MultiplicadorTipoAmbiente[];
  /** Solo relevante si cantidad_fuente === 'igual_a_otra_opcion'. */
  cantidad_referencia_variable_codigo: string | null;
  cantidad_referencia_multiplicador: number;
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

/** Suma, para cada multiplicador definido en la variable, la cantidad de
 *  ambientes de ese tipo en el presupuesto × su multiplicador. A
 *  diferencia de `contarBanos`, no fuerza un mínimo de 1: si ningún
 *  ambiente del presupuesto matchea un tipo con multiplicador, da 0. */
function contarPorTipoAmbiente(
  ambientes: AmbienteInputCalc[],
  multiplicadores: MultiplicadorTipoAmbiente[]
): number {
  let total = 0;
  for (const m of multiplicadores) {
    const count = ambientes.filter((a) => a.tipo === m.tipo_ambiente_codigo).length;
    total += count * m.multiplicador;
  }
  return total;
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

  // ── 2. Opcionales (Etapas 5G/5J) — vajilla, lavavajillas, cafetera, ──
  //      dispensador de agua, ambientadores, insumos de cocina/baño.
  //      Se aplican una vez por presupuesto (no por ambiente).
  //
  //      Orden de resolución: primero las variables cuya cantidad NO
  //      depende de otro opcional ('ninguna' / 'input_cliente' /
  //      'cantidad_banos' / 'por_tipo_ambiente'), guardando la cantidad
  //      resuelta de cada una en `cantidadPorVariable`. Recién después
  //      las 'igual_a_otra_opcion', que leen de ese mapa — así no
  //      importa el orden en que vengan en `input.opcionales`.
  const seleccionados = input.opcionales ?? [];
  const independientes = seleccionados.filter((s) => {
    const v = buscarVariableOpcional(config, s.variable_codigo);
    return v?.cantidad_fuente !== "igual_a_otra_opcion";
  });
  const dependientes = seleccionados.filter((s) => {
    const v = buscarVariableOpcional(config, s.variable_codigo);
    return v?.cantidad_fuente === "igual_a_otra_opcion";
  });

  const cantidadPorVariable = new Map<string, number>();

  function resolverCantidad(
    variable: VariableCotizador,
    seleccion: OpcionalSeleccionado
  ): { cantidad: number; etiqueta: string } {
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
      return {
        cantidad: seleccion.cantidad,
        etiqueta: ` (${seleccion.cantidad} ${variable.unidad_cantidad ?? "unidades"})`,
      };
    }
    if (variable.cantidad_fuente === "cantidad_banos") {
      const cantidad = contarBanos(input.ambientes);
      return { cantidad, etiqueta: ` (x${cantidad} baño/s)` };
    }
    if (variable.cantidad_fuente === "por_tipo_ambiente") {
      const cantidad = contarPorTipoAmbiente(input.ambientes, variable.multiplicadores);
      return { cantidad, etiqueta: ` (x${cantidad})` };
    }
    if (variable.cantidad_fuente === "igual_a_otra_opcion") {
      const refCodigo = variable.cantidad_referencia_variable_codigo;
      const cantidadRef = refCodigo ? cantidadPorVariable.get(refCodigo) ?? 0 : 0;
      const cantidad = cantidadRef * variable.cantidad_referencia_multiplicador;
      return { cantidad, etiqueta: cantidad > 0 ? ` (x${cantidad})` : "" };
    }
    return { cantidad: 1, etiqueta: "" };
  }

  function aplicarOpcional(seleccion: OpcionalSeleccionado) {
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

    const { cantidad, etiqueta } = resolverCantidad(variable, seleccion);
    cantidadPorVariable.set(variable.codigo, cantidad);

    // cantidad = 0 (típico de 'igual_a_otra_opcion' cuando la variable
    // referenciada no fue seleccionada, o de 'por_tipo_ambiente' cuando
    // ningún ambiente matchea): no se cobra, pero queda registrada la
    // cantidad por si otro opcional dependiente la necesita.
    if (cantidad === 0) return;

    const monto = redondear(precioUnitario * cantidad);
    costoMensual += monto;
    detalle.push({
      concepto: `${variable.nombre} — ${opcion.nombre}${etiqueta}`,
      cantidad,
      monto,
    });
  }

  independientes.forEach(aplicarOpcional);
  dependientes.forEach(aplicarOpcional);

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
