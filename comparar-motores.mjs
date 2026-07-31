// Compara el motor legado (/api/cotizar) vs el motor nuevo (/api/cotizador/calcular)
// para los mismos 3 casos — Etapa 6 del plan, adelantada como chequeo rápido
// antes de decidir si conviene ajustar HORA_OPERARIO/MARGEN_COMERCIAL antes
// de la Etapa 5 (modo sombra).
//
// Uso (con `npm run dev` corriendo en otra terminal):
//   node comparar-motores.mjs
//   node comparar-motores.mjs http://localhost:3000

const BASE_URL = process.argv[2] || "http://localhost:3000";

const casos = [
  {
    nombre: "Oficina 50m2, 3x semana",
    legado: {
      ambientes: [{ tipo_ambiente: "oficina", m2: 50 }],
      frecuencia: "3x_semana",
    },
    nuevo: {
      ambientes: [{ tipo: "OFICINA", m2: 50 }],
      frecuencia: "3X_SEMANA",
    },
  },
  {
    nombre: "Baño 15m2, diario",
    legado: {
      ambientes: [{ tipo_ambiente: "bano", m2: 15 }],
      frecuencia: "diario",
    },
    nuevo: {
      ambientes: [{ tipo: "BANO", m2: 15 }],
      frecuencia: "DIARIO",
    },
  },
  {
    nombre: "Auditorio 100m2, 1x semana",
    legado: {
      ambientes: [{ tipo_ambiente: "auditorio", m2: 100 }],
      frecuencia: "1x_semana",
    },
    nuevo: {
      ambientes: [{ tipo: "AUDITORIO", m2: 100 }],
      frecuencia: "1X_SEMANA",
    },
  },
];

async function pedir(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function correrCaso({ nombre, legado, nuevo }) {
  console.log("==================================================");
  console.log(`Caso: ${nombre}`);
  console.log("--------------------------------------------------");

  try {
    const [rLegado, rNuevo] = await Promise.all([
      pedir("/api/cotizar", legado),
      pedir("/api/cotizador/calcular", nuevo),
    ]);

    const precioLegado = rLegado.data?.cotizacion?.total_mensual;
    const precioNuevo = rNuevo.data?.resultado?.precio_mensual;

    if (precioLegado === undefined) {
      console.log("LEGADO — error o shape inesperado:", JSON.stringify(rLegado.data));
    }
    if (precioNuevo === undefined) {
      console.log("NUEVO — error o shape inesperado:", JSON.stringify(rNuevo.data));
    }

    if (precioLegado !== undefined && precioNuevo !== undefined) {
      const diferencia = precioNuevo - precioLegado;
      const porcentaje = ((diferencia / precioLegado) * 100).toFixed(1);
      console.log(`Motor legado (pricingData.ts, venta):   $${precioLegado}`);
      console.log(`Motor nuevo  (costo + margen, engine.ts): $${precioNuevo}`);
      console.log(
        `Diferencia: $${diferencia.toFixed(2)} (${diferencia >= 0 ? "+" : ""}${porcentaje}% respecto al legado)`
      );
    }
  } catch (err) {
    console.log("ERROR DE CONEXIÓN — ¿está corriendo `npm run dev`?");
    console.log(err.message);
  }
  console.log();
}

for (const caso of casos) {
  await correrCaso(caso);
}

console.log("==================================================");
console.log("Listo. Pegame esta salida completa.");
