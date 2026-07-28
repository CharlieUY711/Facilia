# FACILIA — Plataforma web

Plataforma comercial completa de FACILIA (Facility Services by ODDY): landing page,
cotizador automático, generación de PDF, registro de leads en Supabase y panel interno.

**Stack:** Next.js 14 (App Router) + Tailwind · Supabase (Postgres + Auth) · @react-pdf/renderer (PDF) · Vercel (deploy)

---

## 1. Instalación local

```bash
npm install
cp .env.example .env.local
```

Completá `.env.local` con tus credenciales reales (ver secciones 2 y 3 abajo).

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

---

## 2. Configurar Supabase

### 2.1 Crear el esquema de base de datos

1. Andá a tu proyecto en [supabase.com](https://supabase.com) → **SQL Editor** → **New query**.
2. Pegá y ejecutá todo el contenido de [`supabase/schema.sql`](./supabase/schema.sql).
   Esto crea la tabla `leads`, la numeración automática de presupuestos
   (`FAC-2026-000001`, etc.) y las políticas de Row Level Security.

### 2.2 Obtener las API keys

En tu proyecto de Supabase: **Project Settings → API**.

| Variable | Dónde encontrarla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "anon / public" key |
| `SUPABASE_SERVICE_ROLE_KEY` | "service_role" key — **secreta**, nunca la expongas en el cliente |

### 2.3 Crear el usuario del panel interno

El panel usa **Supabase Auth** (email + contraseña). Para crear tu primer usuario:

**Project → Authentication → Users → Add user** (creá el usuario manualmente con
email y contraseña, marcando "Auto Confirm User").

Con ese usuario ya podés entrar en `/panel/login`.

### 2.4 Habilitar el envío de invitaciones por email

El Directorio (`/dashboard/usuarios`) invita gente por email usando
`supabase.auth.admin.inviteUserByEmail`. Para que el mail salga andando:

**Project → Authentication → Emails / SMTP** — configurá un proveedor SMTP
propio (Supabase tiene un límite muy bajo de emails con su servidor por
defecto, no sirve para producción) y revisá la plantilla **"Invite user"**.

---

## 3. El Directorio (Organizaciones · Personas · Locaciones)

`/dashboard/usuarios` — visible como la tarjeta **"Directorio"** en el
dashboard — reemplaza la antigua pantalla de "Usuarios y roles". Ahora es un
directorio completo:

- **Organizaciones**: clientes, proveedores o la propia FACILIA.
- **Locaciones**: sedes donde se presta el servicio. Son independientes de
  las organizaciones (`organizacion_id` es opcional) porque una locación no
  siempre coincide con la dirección fiscal de un cliente.
- **Personas**: todo contacto — cliente, personal FACILIA o proveedor —
  tenga o no acceso al sistema todavía. Se puede:
  - Cargar una persona sin darle login (queda como "Sin acceso").
  - **Invitar acceso**: le manda un mail de invitación y le asigna el rol
    elegido apenas confirma.
  - Cambiar el rol de alguien que ya tiene acceso, desde la misma tabla.
  - **Revocar acceso**: borra su login sin borrar el contacto del
    directorio (se lo puede volver a invitar después).

**Permisos:** solo **Super Admin** y **Administrador** pueden gestionar el
directorio. Ningún rol puede tocarse a sí mismo de forma que se quede sin
acceso, y solo Super Admin puede otorgar o modificar el rol `super_admin`
(reforzado tanto en las rutas API como con Row Level Security en Postgres).

Si ya tenías el proyecto corriendo antes de este cambio, volvé a ejecutar
[`supabase/schema.sql`](./supabase/schema.sql) completo — es idempotente y
además migra (backfill) una Persona por cada usuario que ya existía.

---

## 4. Editar el JSON maestro de precios

**Toda la lógica de precios vive en un solo archivo:** [`lib/pricingData.ts`](./lib/pricingData.ts).

Cada valor está guardado como un rango `{ min, max }`, igual que en el JSON
original de FACILIA. Por ejemplo:

```ts
oficina: {
  precio_m2_visita: r(0.12, 0.2),   // antes: "0.12-0.20"
  precio_m2_mes: r(2.5, 4.5),
  ...
}
```

Para **cambiar un precio**: editá los números directamente en este archivo.

Para **cambiar en qué punto del rango cotiza el sistema** (más cerca del piso,
del techo, o el punto medio) sin tocar ningún número: ajustá la variable de
entorno `PRICING_MARGIN` (0 = mínimo, 1 = máximo, 0.5 = punto medio — default).

No hace falta tocar `lib/calculatePrice.ts`, las rutas API ni el frontend para
actualizar precios — solo `pricingData.ts` y/o `PRICING_MARGIN`.

---

## 4. Desplegar en Vercel

1. Subí este proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New Project** → importá el repo.
3. En **Environment Variables**, agregá todas las variables de `.env.example`
   con sus valores reales de producción.
4. Deploy. Vercel detecta Next.js automáticamente, no requiere configuración
   adicional.
5. Actualizá `NEXT_PUBLIC_SITE_URL` con tu dominio real de producción (se usa
   para los links de los emails y el QR del PDF).

---

## 5. Estructura del proyecto

```
/app
  /page.tsx                  Landing page
  /cotizador/page.tsx        Cotizador (multi-step, cálculo en vivo)
  /panel/page.tsx             Panel interno (lista de leads + métricas)
  /panel/login/page.tsx       Login del panel (Supabase Auth)
  /lead/[id]/page.tsx          Detalle de un lead (PDF, cambiar estado)
  /api/cotizar/route.ts        POST → calcula un presupuesto (sin guardar)
  /api/leads/route.ts          POST → guarda lead + genera PDF
                                GET  → lista leads (requiere sesión)
  /api/leads/[id]/route.ts     GET/PATCH → detalle y cambio de estado de un lead
  /api/pdf/route.ts            POST → genera un PDF puntual (preview)
/components                   Componentes de UI reutilizables
/lib
  pricingData.ts               ← Datos maestros de precios (editar acá)
  calculatePrice.ts             Motor de cálculo del cotizador
  pdf.tsx                       Template del PDF (@react-pdf/renderer)
  formatCurrency.ts
  /supabase/client.ts            Cliente Supabase (browser)
  /supabase/server.ts            Cliente Supabase (server, + service role)
/supabase/schema.sql           Esquema SQL a correr en Supabase
middleware.ts                  Protege /panel y /lead/* con Supabase Auth
```

---

## 6. Flujo del cotizador

1. El visitante completa tipo de ambiente, m², frecuencia y opcionales en
   `/cotizador` → el precio se recalcula en vivo llamando a `/api/cotizar`.
2. Al completar sus datos de contacto y enviar, se llama a `/api/leads` (POST),
   que en un solo paso:
   - Calcula el presupuesto final
   - Lo guarda en Supabase (tabla `leads`, con numeración automática)
   - Genera el PDF con el detalle completo
   - Envía el PDF por email al cliente y una copia interna a FACILIA
3. El lead queda visible en `/panel`, donde el equipo puede reenviar el PDF,
   marcarlo como aceptado/perdido, y ver el detalle completo en `/lead/[id]`.

---

## 7. Identidad de marca

Los colores, tipografía y logos usados en toda la plataforma están tomados del
**Manual de Marca FACILIA v1.0**: Navy `#0B2A61`, Orange `#D97400` (color
distintivo de la unidad), Blue `#0169F5`, tipografía Poppins para títulos.
Los archivos de logo están en `/public`.
