/**
 * FACILIA — Datos maestros del cotizador
 * ----------------------------------------------------------------
 * Este archivo es la ÚNICA fuente de verdad de precios. Está
 * generado a partir del JSON maestro provisto por FACILIA. Todos
 * los valores se guardan como rangos {min, max} en dólares (o la
 * moneda que definan) y se resuelven a un número concreto usando
 * PRICING_MARGIN (env var, default 0.5 = punto medio del rango).
 *
 * Para ajustar precios: editá los números de este archivo.
 * Para ajustar QUÉ TAN CERCA del piso o del techo cotiza el
 * sistema: cambiá PRICING_MARGIN en .env (no toques este archivo).
 */

export type Range = { min: number; max: number };

const r = (min: number, max: number): Range => ({ min, max });

// ── 1. Limpieza por tipo de ambiente (nivel "habitación/sala") ──
// Nota: esto es distinto del "tipo de espacio" (Oficina / Local comercial /
// Depósito / Edificio) que se pregunta al principio del cotizador — ese es
// solo una clasificación del comercio, no tiene tarifa propia. Acá se
// cotiza cada ambiente concreto que el cliente agregue en la tabla.
export const limpieza = {
  oficina: {
    label: "Oficina",
    precio_m2_visita: r(0.12, 0.2),
    precio_m2_mes: r(2.5, 4.5),
    extras: {} as Record<string, Range>,
  },
  bano: {
    label: "Baño",
    precio_m2_visita: r(0.3, 0.55),
    precio_m2_mes: r(6, 12),
    extras: { por_bano: r(15, 30) },
  },
  cocina: {
    label: "Cocina",
    precio_m2_visita: r(0.2, 0.35),
    precio_m2_mes: r(4, 7),
    extras: {} as Record<string, Range>,
  },
  sala_reuniones: {
    label: "Sala de reuniones",
    // Nota: tarifa de referencia, a confirmar con FACILIA.
    precio_m2_visita: r(0.15, 0.28),
    precio_m2_mes: r(3, 5.5),
    extras: {} as Record<string, Range>,
  },
  auditorio: {
    label: "Auditorio",
    // Nota: tarifa de referencia, a confirmar con FACILIA.
    precio_m2_visita: r(0.14, 0.25),
    precio_m2_mes: r(2.8, 5),
    extras: {} as Record<string, Range>,
  },
  espacios_comunes: {
    label: "Espacios comunes",
    precio_m2_visita: null as Range | null, // solo se cotiza mensual
    precio_m2_mes: r(1.5, 3.5),
    extras: {} as Record<string, Range>,
  },
  barbacoa: {
    label: "Barbacoa / Parrillero",
    precio_m2_visita: r(0.25, 0.45),
    precio_m2_mes: r(5, 9),
    extras: { parrilla: r(10, 20) },
  },
} as const;

export type TipoAmbiente = keyof typeof limpieza;

// ── 1b. Tipo de espacio (clasificación general, sin tarifa propia) ──
export const tiposEspacio = {
  oficina: { label: "Oficina" },
  local_comercial: { label: "Local comercial" },
  deposito: { label: "Depósito" },
  edificio: { label: "Edificio", sublabel: "(Áreas comunes)" },
} as const;

export type TipoEspacio = keyof typeof tiposEspacio;

// ── 2. Costos internos (para dashboard de margen, no visibles al cliente) ─
export const costosInternos = {
  mano_obra_m2: r(0.02, 0.04),
  insumos_m2: {
    oficina: r(0.005, 0.01),
    bano: r(0.02, 0.04),
    cocina: r(0.015, 0.03),
    sala_reuniones: r(0.005, 0.01),
    auditorio: r(0.005, 0.01),
    espacios_comunes: r(0.005, 0.01),
    barbacoa: r(0.02, 0.05),
  },
};

// ── 3. Insumos de Cocina & Baño (venta al cliente) ────────────────
// Cada insumo tiene 3 niveles de calidad (precio mensual, por baño/ambiente)
// y un add-on opcional de dispensador (tarifa plana mensual, una vez por
// presupuesto, no por baño).
export type NivelInsumo = "estandar" | "premium" | "ultra_premium";

export const insumosCocinaBano = {
  detergente: {
    label: "Detergente",
    niveles: {
      estandar: r(5, 8),
      premium: r(8, 12),
      ultra_premium: r(12, 18),
    } as Record<NivelInsumo, Range>,
    dispensador_mensual: r(3, 6),
  },
  toallas_papel: {
    label: "Toallas de papel",
    niveles: {
      estandar: r(16, 22),
      premium: r(22, 30),
      ultra_premium: r(30, 40),
    } as Record<NivelInsumo, Range>,
    dispensador_mensual: r(4, 7),
  },
  jabon_liquido: {
    label: "Jabón líquido",
    niveles: {
      estandar: r(4, 6),
      premium: r(6, 9),
      ultra_premium: r(9, 14),
    } as Record<NivelInsumo, Range>,
    dispensador_mensual: r(3, 6),
  },
  papel_higienico: {
    label: "Papel higiénico",
    niveles: {
      estandar: r(24, 30),
      premium: r(30, 38),
      ultra_premium: r(38, 50),
    } as Record<NivelInsumo, Range>,
    dispensador_mensual: r(4, 7),
  },
};

export type InsumoCocinaBanoKey = keyof typeof insumosCocinaBano;

export const nivelesInsumoLabels: Record<NivelInsumo, string> = {
  estandar: "Estándar",
  premium: "Premium",
  ultra_premium: "Ultra premium",
};

// ── 3b. Ambientadores (cantidad de unidades, 1 a 12) ──────────────
export const ambientadoresData = {
  label: "Ambientadores",
  unidad_mensual: r(8, 12), // arrendamiento del dispositivo, por unidad
  insumos_mensual_unidad: r(3, 5), // recarga/insumos, por unidad, si se marca "Incluye insumos"
};

// ── 4. Dispensadores de agua (tarifa plana mensual) ──────────────
export const dispensadoresAgua = {
  frio_caliente: { label: "Frío / Caliente", tarifa_plana: r(35, 55), incluye: ["Agua ilimitada", "Mantenimiento"] },
  con_filtro: { label: "Con filtro", tarifa_plana: r(45, 65), incluye: ["Filtros", "Mantenimiento"] },
  osmosis: { label: "Ósmosis inversa", tarifa_plana: r(70, 95), incluye: ["Filtros", "Mantenimiento"] },
  compacto: { label: "Compacto", tarifa_plana: r(15, 25), incluye: [] as string[] },
};

// ── 5. Cafeteras (arrendamiento mensual) ─────────────────────────
export const cafeteras = {
  capsulas: { label: "Cápsulas", arrendamiento: r(15, 25), capsula_unidad: r(0.4, 0.6) },
  espresso: { label: "Espresso", arrendamiento: r(40, 70) },
  filtro: { label: "Filtro", arrendamiento: r(10, 20) },
};

// ── 6. Lavavajillas ───────────────────────────────────────────────
export const lavavajillas = {
  tipos: {
    de_mesas: { label: "De mesas", arrendamiento: r(25, 35) },
    de_piso: { label: "De piso", arrendamiento: r(35, 45) },
  },
  insumos_mensual: r(8, 15), // detergente, si se marca "Incluye insumos"
};

export type LavavajillasTipo = keyof typeof lavavajillas.tipos;

// ── 7. Vajilla ────────────────────────────────────────────────────
// El cliente elige Tipo + Cantidad de unidades; el Plazo (semana, mes,
// trimestre...) es la duración del contrato/arrendamiento y se muestra
// como referencia, pero el monto mensual se calcula como
// precio_unidad(tipo) × cantidad.
export const vajilla = {
  estandar: { label: "Estándar", precio_persona: r(3, 6) },
  premium: { label: "Premium", precio_persona: r(6, 12) },
  personalizada: {
    label: "Personalizada",
    precio_persona: r(6, 12),
    precio_set: r(15, 30),
    cocina_completa: r(35, 60),
  },
  opcionales: {
    sanitizacion_semanal: r(5, 10),
    // reposicion_total ya incluida en el plan premium
  },
};

// ── 8. Regalo de bienvenida ───────────────────────────────────────
export const regaloBienvenida = {
  tazas_sublimadas: {
    cantidad: 6,
    costo_facilia: r(12, 18),
    valor_percibido: r(60, 120),
  },
};

// ── 9. Frecuencias de visita → visitas/mes (para pasar de precio_visita a precio_mensual) ─
export const frecuencias = {
  "1x_semana": { label: "1 vez por semana", visitas_mes: 4 },
  "2x_semana": { label: "2 veces por semana", visitas_mes: 8 },
  "3x_semana": { label: "3 veces por semana", visitas_mes: 12 },
  "5x_semana": { label: "5 veces por semana (L-V)", visitas_mes: 20 },
  diario: { label: "Diario (incl. fines de semana)", visitas_mes: 22 },
} as const;

export type Frecuencia = keyof typeof frecuencias;

// ── 10. Plan Ultra Premium (bundle) ───────────────────────────────
export const planUltraPremium = {
  label: "Plan Ultra Premium",
  incluye: [
    "Limpieza",
    "Insumos",
    "Ambientadores",
    "Dispensador de agua",
    "Cafetera",
    "Lavavajillas",
    "Vajilla serigrafiada",
    "Aspiradora",
    "Reposición",
    "Mantenimiento",
  ],
};

// ── Helper: resuelve un rango a un número según el margen configurado ──
export function resolveRange(range: Range, margin = 0.5): number {
  const m = Math.min(1, Math.max(0, margin));
  return Number((range.min + (range.max - range.min) * m).toFixed(2));
}
