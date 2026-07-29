// Prueba los 3 casos del checklist contra POST /api/cotizador/calcular.
//
// Uso (con `npm run dev` corriendo en otra terminal):
//   node test-calcular.mjs
//   node test-calcular.mjs http://localhost:3000   (si tu server no está en el puerto 3000)

const BASE_URL = process.argv[2] || "http://localhost:3000";
const ENDPOINT = `${BASE_URL}/api/cotizador/calcular`;

const casos = [
  {
    nombre: "Oficina 50m2, 3x semana",
    body: { ambientes: [{ tipo: "OFICINA", m2: 50 }], frecuencia: "3X_SEMANA" },
  },
  {
    nombre: "Baño 15m2, diario",
    body: { ambientes: [{ tipo: "BANO", m2: 15 }], frecuencia: "DIARIO" },
  },
  {
    nombre: "Auditorio 100m2, 1x semana",
    body: { ambientes: [{ tipo: "AUDITORIO", m2: 100 }], frecuencia: "1X_SEMANA" },
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
console.log('Listo. Si algún caso devolvió "ok": false, pegame ese JSON completo.');
