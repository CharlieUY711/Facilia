import {
  limpieza,
  TipoAmbiente,
  frecuencias,
  Frecuencia,
  resolveRange,
  dispensadoresAgua,
  cafeteras,
  lavavajillas,
  LavavajillasTipo,
  vajilla,
  insumosCocinaBano,
  InsumoCocinaBanoKey,
  NivelInsumo,
  ambientadoresData,
  regaloBienvenida,
} from "./pricingData";

const MARGIN = Number(process.env.PRICING_MARGIN ?? 0.5);

export interface VajillaInput {
  tipo: "estandar" | "premium" | "personalizada";
  cantidad: number;
  plazo?: "semana" | "mes" | "trimestre" | "semestre" | "anio" | "contrato";
}

export interface LavavajillasInput {
  tipo: LavavajillasTipo; // "de_mesas" | "de_piso" — el precio ya incluye consumibles
}

export interface AmbientadoresInput {
  cantidad: number; // 1 a 12 — el precio ya incluye consumibles
}

export interface InsumoCocinaBanoInput {
  nivel: NivelInsumo;
  incluir_dispensador?: boolean;
}

export interface OpcionalesInput {
  vajilla?: VajillaInput;
  vajilla_sanitizacion_semanal?: boolean;
  lavavajillas?: LavavajillasInput;
  cafetera?: keyof typeof cafeteras;
  dispensador_agua?: keyof typeof dispensadoresAgua;
  ambientadores?: AmbientadoresInput;
  insumos_cocina_bano?: Partial<Record<InsumoCocinaBanoKey, InsumoCocinaBanoInput>>;
}

// Un espacio puede estar compuesto por varios ambientes (ej: Baño 1, Baño 2,
// Cocina...). Cada uno se cotiza con su propio tipo y metraje. usuarios,
// luz_natural y ventana son datos informativos (no afectan el precio) que
// se guardan para referencia del equipo comercial.
export interface AmbienteInput {
  tipo_ambiente: TipoAmbiente;
  m2: number;
  usuarios?: number;
  luz_natural?: boolean;
  ventana?: boolean;
}

// Datos estructurales del espacio, también informativos (no afectan precio).
export interface EstructuraInput {
  tipo_espacio?: string;
  plantas?: string;
  subsuelos?: string;
  barbacoa_personas?: string;
  turnos?: string;
  horario?: string;
  usuarios_totales?: string;
}

export interface CotizadorInput {
  ambientes: AmbienteInput[];
  frecuencia: Frecuencia;
  opcionales?: OpcionalesInput;
  estructura?: EstructuraInput;
}

export interface LineaPrecio {
  concepto: string;
  monto_mensual: number;
}

export interface AmbienteResultado {
  tipo_ambiente: TipoAmbiente;
  label: string; // etiqueta ya numerada si hay ambientes repetidos, ej: "Baño 1"
  m2: number;
  usuarios?: number;
  luz_natural?: boolean;
  ventana?: boolean;
  subtotal_mensual: number;
}

export interface CotizacionResult {
  ambientes: AmbienteResultado[];
  estructura?: EstructuraInput;
  frecuencia: Frecuencia;
  lineas: LineaPrecio[];
  total_mensual: number;
  total_por_visita: number;
  regalo_bienvenida: { descripcion: string; cantidad: number; valor_percibido: number };
}

export function calculatePrice(input: CotizadorInput): CotizacionResult {
  const { ambientes, frecuencia, opcionales = {}, estructura } = input;

  if (!ambientes || ambientes.length === 0) {
    throw new Error("Agregá al menos un ambiente para cotizar");
  }
  const visitasMes = frecuencias[frecuencia]?.visitas_mes;
  if (!visitasMes) throw new Error(`Frecuencia desconocida: ${frecuencia}`);

  const lineas: LineaPrecio[] = [];
  const ambientesResultado: AmbienteResultado[] = [];

  // Para numerar ambientes repetidos: "Baño 1", "Baño 2"...
  const contadorPorTipo: Record<string, number> = {};
  const totalPorTipo: Record<string, number> = {};
  for (const a of ambientes) totalPorTipo[a.tipo_ambiente] = (totalPorTipo[a.tipo_ambiente] ?? 0) + 1;

  let banosCount = 0;

  ambientes.forEach((a, idx) => {
    const { tipo_ambiente, m2 } = a;
    if (!m2 || m2 <= 0) throw new Error(`Superficie inválida para el ambiente #${idx + 1}`);
    const ambiente = limpieza[tipo_ambiente];
    if (!ambiente) throw new Error(`Tipo de ambiente desconocido: ${tipo_ambiente}`);

    contadorPorTipo[tipo_ambiente] = (contadorPorTipo[tipo_ambiente] ?? 0) + 1;
    const label =
      totalPorTipo[tipo_ambiente] > 1
        ? `${ambiente.label} ${contadorPorTipo[tipo_ambiente]}`
        : ambiente.label;

    let precioBaseMensual = 0;
    if (ambiente.precio_m2_visita) {
      const tarifaVisita = resolveRange(ambiente.precio_m2_visita, MARGIN);
      const precioBaseVisita = Number((tarifaVisita * m2).toFixed(2));
      precioBaseMensual = Number((precioBaseVisita * visitasMes).toFixed(2));
    } else {
      const tarifaMes = resolveRange(ambiente.precio_m2_mes, MARGIN);
      precioBaseMensual = Number((tarifaMes * m2).toFixed(2));
    }

    let subtotalAmbiente = precioBaseMensual;
    lineas.push({ concepto: `Limpieza — ${label} (${m2} m²)`, monto_mensual: precioBaseMensual });

    if (tipo_ambiente === "bano") {
      banosCount += 1;
      if (limpieza.bano.extras.por_bano) {
        const extra = resolveRange(limpieza.bano.extras.por_bano, MARGIN);
        lineas.push({ concepto: `Extra por baño — ${label}`, monto_mensual: Number(extra.toFixed(2)) });
        subtotalAmbiente += extra;
      }
    }

    ambientesResultado.push({
      tipo_ambiente,
      label,
      m2,
      usuarios: a.usuarios,
      luz_natural: a.luz_natural,
      ventana: a.ventana,
      subtotal_mensual: Number(subtotalAmbiente.toFixed(2)),
    });
  });

  // Opcionales — se aplican una vez por presupuesto (no por ambiente)
  if (opcionales.vajilla) {
    const { tipo, cantidad, plazo } = opcionales.vajilla;
    const cfg = vajilla[tipo];
    const precioUnidad = resolveRange(cfg.precio_persona, MARGIN);
    const monto = Number((precioUnidad * cantidad).toFixed(2));
    const plazoTxt = plazo ? ` — contrato: ${plazo}` : "";
    lineas.push({ concepto: `Vajilla ${cfg.label} (${cantidad} unidades)${plazoTxt}`, monto_mensual: monto });

    if (opcionales.vajilla_sanitizacion_semanal) {
      const san = resolveRange(vajilla.opcionales.sanitizacion_semanal, MARGIN);
      lineas.push({ concepto: "Sanitización semanal de vajilla", monto_mensual: san });
    }
  }

  if (opcionales.lavavajillas) {
    const { tipo } = opcionales.lavavajillas;
    const cfg = lavavajillas.tipos[tipo];
    if (cfg) {
      const arrend = resolveRange(cfg.arrendamiento, MARGIN);
      lineas.push({ concepto: `Lavavajillas — ${cfg.label}`, monto_mensual: arrend });
      const insumos = resolveRange(lavavajillas.insumos_mensual, MARGIN);
      lineas.push({ concepto: "Lavavajillas — consumibles (detergente)", monto_mensual: insumos });
    }
  }

  if (opcionales.cafetera) {
    const cfg = cafeteras[opcionales.cafetera];
    const monto = resolveRange(cfg.arrendamiento, MARGIN);
    lineas.push({ concepto: `Cafetera — ${cfg.label}`, monto_mensual: monto });
  }

  if (opcionales.dispensador_agua) {
    const cfg = dispensadoresAgua[opcionales.dispensador_agua];
    const monto = resolveRange(cfg.tarifa_plana, MARGIN);
    lineas.push({ concepto: `Dispensador de agua — ${cfg.label}`, monto_mensual: monto });
  }

  if (opcionales.ambientadores?.cantidad) {
    const { cantidad } = opcionales.ambientadores;
    const unidad = resolveRange(ambientadoresData.unidad_mensual, MARGIN);
    const monto = Number((unidad * cantidad).toFixed(2));
    lineas.push({ concepto: `Ambientadores (x${cantidad})`, monto_mensual: monto });
    const insumoUnidad = resolveRange(ambientadoresData.insumos_mensual_unidad, MARGIN);
    const montoInsumos = Number((insumoUnidad * cantidad).toFixed(2));
    lineas.push({ concepto: `Ambientadores — consumibles (x${cantidad})`, monto_mensual: montoInsumos });
  }

  if (opcionales.insumos_cocina_bano) {
    const cantidadBanos = Math.max(1, banosCount);
    for (const [key, seleccion] of Object.entries(opcionales.insumos_cocina_bano)) {
      if (!seleccion) continue;
      const cfg = insumosCocinaBano[key as InsumoCocinaBanoKey];
      if (!cfg) continue;
      const { nivel, incluir_dispensador } = seleccion;
      const rango = cfg.niveles[nivel];
      if (!rango) continue;
      const monto = Number((resolveRange(rango, MARGIN) * cantidadBanos).toFixed(2));
      const nivelLabel = nivel === "estandar" ? "Estándar" : nivel === "premium" ? "Premium" : "Ultra premium";
      lineas.push({
        concepto: `${cfg.label} — ${nivelLabel} (x${cantidadBanos} baño/s)`,
        monto_mensual: monto,
      });
      if (incluir_dispensador) {
        const montoDispensador = resolveRange(cfg.dispensador_mensual, MARGIN);
        lineas.push({ concepto: `${cfg.label} — dispensador`, monto_mensual: montoDispensador });
      }
    }
  }

  const totalMensual = Number(lineas.reduce((acc, l) => acc + l.monto_mensual, 0).toFixed(2));
  const totalVisita = Number((totalMensual / visitasMes).toFixed(2));

  return {
    ambientes: ambientesResultado,
    estructura,
    frecuencia,
    lineas,
    total_mensual: totalMensual,
    total_por_visita: totalVisita,
    regalo_bienvenida: {
      descripcion: "6 tazas sublimadas FACILIA",
      cantidad: regaloBienvenida.tazas_sublimadas.cantidad,
      valor_percibido: resolveRange(regaloBienvenida.tazas_sublimadas.valor_percibido, MARGIN),
    },
  };
}
