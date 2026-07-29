// Prueba los opcionales nuevos (Etapa 5G) contra POST /api/cotizador/calcular.
// Corré primero la migración 2026_07_28_etapa5G_opcionales_variables.sql
// contra tu Supabase, y con `npm run dev` corriendo en otra terminal:
//
//   node test-calcular-opcionales.mjs
//   node test-calcular-opcionales.mjs http://localhost:3000

const BASE_URL = process.argv[2] || "http://localhost:3000";
const ENDPOINT = `${BASE_URL}/api/cotizador/calcular`;

const casos = [
  {
    nombre: "Oficina 50m2 + vajilla premium 20 personas (cantidad_fuente=input_cliente)",
    body: {
      ambientes: [{ tipo: "OFICINA", m2: 50 }],
      frecuencia: "3X_SEMANA",
      opcionales: [{ variable_codigo: "VAJILLA_TIPO", opcion_codigo: "PREMIUM", cantidad: 20 }],
    },
  },
  {
    nombre: "2 baños + detergente estándar (cantidad_fuente=cantidad_banos, debería multiplicar x2)",
    body: {
      ambientes: [
        { tipo: "BANO", m2: 15 },
        { tipo: "BANO", m2: 10 },
      ],
      frecuencia: "DIARIO",
      opcionales: [{ variable_codigo: "INSUMO_DETERGENTE_NIVEL", opcion_codigo: "ESTANDAR" }],
    },
  },
  {
    nombre: "Oficina + cafetera espresso (cantidad_fuente=ninguna, tarifa fija)",
    body: {
      ambientes: [{ tipo: "OFICINA", m2: 30 }],
      frecuencia: "1X_SEMANA",
      opcionales: [{ variable_codigo: "CAFETERA_TIPO", opcion_codigo: "ESPRESSO" }],
    },
  },
  {
    nombre: "Vajilla SIN cantidad — debe fallar con error explícito (validación cantidad_min)",
    body: {
      ambientes: [{ tipo: "OFICINA", m2: 30 }],
      frecuencia: "1X_SEMANA",
      opcionales: [{ variable_codigo: "VAJILLA_TIPO", opcion_codigo: "ESTANDAR" }],
    },
  },
];

async function correrCaso({ nombre, body }) {
  console.log("==================================================");
  console.log(`Caso: ${nombre}`);
  console.log(`POST ${ENDPOINT}`);
  console.log(`Body: ${JSON.stringify(body)}`);
  console.log("--------------------------------------------------");

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log(`HTTP ${res.status}`);
    console.log(JSON.stringify(data, null, 2));
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
console.log(
  'Listo. Los primeros 3 casos deberían dar "ok": true. El 4to DEBE dar "ok": false ' +
    "con un mensaje pidiendo la cantidad — si no, avisame, hay un bug en la validación."
);
