# GEO-02 — Backend Core, Servicios y APIs

> Continúa GEO-00 y GEO-01. No se redefinen entidades, Value Objects ni el
> esquema SQL (ya congelados en GEO-01). Esta etapa implementa
> infraestructura Supabase, casos de uso concretos y las API Routes reales.

## 1. Corrección de rumbo respecto a Library (hallazgo de esta etapa)

Al preparar el cableado de las API Routes se confirmó que
`app/api/library/**` (las rutas realmente montadas por Next.js) **no usan**
`modules/library/presentation/api/` — usan una implementación paralela y
más simple en `lib/library/*`. La carpeta `modules/library/presentation/api/`
existe pero Next.js **no la ejecuta nunca**, porque el App Router solo trata
como endpoint un archivo `route.ts` físicamente ubicado bajo `app/`.

Para que GEO no repita ese desperdicio de trabajo, la capa de presentación
se dividió en dos partes con responsabilidades distintas:

* `modules/geo/presentation/api/_container.ts` y `_auth-context.ts` — lógica
  compartida (construcción de casos de uso, autenticación), **sí** se
  importa desde los endpoints reales.
* `app/api/geo/**/route.ts` — los endpoints reales que Next.js monta,
  delgados, que importan lo anterior. **Esto es lo único que Next.js
  ejecuta.**

Esto también obligó a corregir `_auth-context.ts`: en vez de copiar el
patrón roto de Library (`createServerSupabaseClient`, claim
`user_metadata.organization_id`, ninguno existe), `getGeoAuth()` calca el
patrón real y probado de `lib/rrhh/auth.ts` (`getRrhhAuth`): `requireAuth()`
+ `createServiceClient()` para resolver la `persona_id` propia.

## 2. Infraestructura Supabase implementada

`modules/geo/infrastructure/mappers/`: `DeviceMapper`,
`TrackingSessionMapper`, `LocationRecordMapper`, `GeofenceMapper`,
`PresenceEventMapper`, `LocationValidationMapper` — cada uno con
`toDomain(row)` / `toRow(entity)` / `toDTO(entity)`.

`modules/geo/infrastructure/supabase/`: `SupabaseDeviceRepository`,
`SupabaseTrackingSessionRepository`, `SupabaseLocationRepository`,
`SupabaseGeofenceRepository`, `SupabasePresenceEventRepository`,
`SupabaseLocationValidationRepository` — implementan las interfaces de
GEO-01 contra las tablas `geo_*`.

`modules/geo/infrastructure/supabase/PersonaDirectoryReader.ts` —
adaptador de **solo lectura** hacia `public.personas`, vía
`supabase.rpc('geo_is_trackable_persona', ...)` (la función SQL ya definida
en GEO-01). Evita registrar dispositivos o iniciar tracking para una
`persona_id` inexistente o no trackeable, sin que GEO llegue a "poseer"
datos de Directorio.

## 3. Servicio de distancia

`modules/geo/application/services/HaversineDistanceCalculator.ts` —
`calculateDistanceMeters(a, b)`, implementación pura de la fórmula
Haversine, sin dependencias externas. Confirma la decisión de GEO-00/01 de
no usar PostGIS.

## 4. Casos de uso implementados

| Caso de uso | Archivo | Notas |
|---|---|---|
| RegisterDevice | `use-cases/devices/RegisterDevice.ts` | Re-registrar un `deviceIdentifier` existente reasigna en vez de duplicar |
| UpdateDeviceStatus | `use-cases/devices/UpdateDeviceStatus.ts` | Solo Admin (aplicado en la API route) |
| StartTrackingSession | `use-cases/tracking/StartTrackingSession.ts` | Valida persona trackeable, dueño del dispositivo, dispositivo usable, sin sesión activa duplicada |
| EndTrackingSession | `use-cases/tracking/EndTrackingSession.ts` | Valida pertenencia antes de cerrar |
| RecordLocation | `use-cases/locations/RecordLocation.ts` | Valida sesión activa y pertenencia; una sola responsabilidad (no dispara presencia) |
| CreateGeofence / UpdateGeofence / SetGeofenceStatus | `use-cases/geofences/` | `SetGeofenceStatus` y `UpdateGeofence` se agregaron en esta etapa (no estaban en `UseCaseContracts.ts` de GEO-01; se ampliaron ahí mismo, sin tocar los contratos ya existentes) |
| DetectPresence | `use-cases/presence/DetectPresence.ts` | **Versión básica**: compara distancia ≤ radio, sin máquina de estados OUTSIDE→ENTERING→INSIDE→LEAVING ni persistencia mínima/continuidad — eso es GEO-05. Sí aplica ya el control de precisión GPS (`LocationAccuracy.isAcceptableFor`) |
| ValidateLocation | `use-cases/validation/ValidateLocation.ts` | **Versión básica**: tolerancia fija de 15 min → `VALIDATED`/`PARTIAL`/`FAILED`. Sin distinguir `ON_TIME`/`LATE`/`EARLY` — eso es GEO-05 |

## 5. API Routes reales (`app/api/geo/`)

| Endpoint | Método | Acceso |
|---|---|---|
| `/api/geo/devices` | GET, POST | Admin ve/gestiona todo; una persona solo lo propio |
| `/api/geo/devices/{id}` | PATCH | Solo Admin (cambio de estado) |
| `/api/geo/tracking/start` | POST | Persona propia (trackeable) |
| `/api/geo/tracking/end` | POST | Persona propia |
| `/api/geo/tracking/active` | GET | Propia, o cualquiera si Admin |
| `/api/geo/locations` | POST | Persona propia — usa **Service Role** (ver §6) y encadena `DetectPresence` |
| `/api/geo/locations` | GET | Histórico, RLS-restringido |
| `/api/geo/locations/{personaId}` | GET | Última posición conocida — Admin o propia |
| `/api/geo/geofences` | GET, POST | Solo Admin |
| `/api/geo/geofences/{id}` | PATCH | Solo Admin (geometría/nombre y/o estado) |
| `/api/geo/presence/events` | GET | Admin ve todo; persona solo lo propio |
| `/api/geo/presence/current` | GET | Último evento (o por geocerca puntual) |

Todos usan `{ ok: boolean, ...payload }` como forma de respuesta, igual
criterio que `app/api/library/**` y `app/api/rrhh/**`.

## 6. Decisión de cliente Supabase por endpoint

* **Sesión de cookies (`createClient()`)** para todo lo que actúa "como la
  persona logueada" y donde RLS ya hace de segunda barrera: devices,
  tracking start/end/active, geofences (admin), presence, histórico de
  locations.
* **Service Role (`createServiceClient()`)** únicamente en `POST
  /api/geo/locations` (ingesta de alta frecuencia desde la PWA, GEO-00 §11)
  — la autenticación igual pasa por `getGeoAuth()` (sesión de cookies) antes
  de usar el cliente de servicio; la pertenencia de la sesión de tracking
  se valida en `RecordLocation` (capa de aplicación), no en RLS, para este
  endpoint puntual.

## 7. Verificación de compilación

Se instalaron las dependencias reales del repo (`npm install`, sin tocar
`package.json`) y se corrió `npx tsc --noEmit -p tsconfig.json` (el
`tsconfig.json` real del proyecto, `strict: true`). Resultado: **9 errores
preexistentes, cero relacionados con GEO** — confirmado filtrando la salida
por `"geo"`. Los preexistentes son:

* 8 errores por `CotizadorForm.tsx` duplicado entre `app/api/cotizador/...`
  y `lib/app/api/cotizador/...` (identificadores duplicados).
* 1 error en `modules/library/presentation/api/_auth-context.ts`
  (`createServerSupabaseClient` no existe) — el mismo bug ya documentado en
  GEO-00 §0 y que GEO evitó deliberadamente.

Ninguno de los dos se originó en este trabajo ni fue modificado por GEO.

## 8. Archivos creados en esta etapa

```
modules/geo/infrastructure/mappers/DeviceMapper.ts
modules/geo/infrastructure/mappers/TrackingSessionMapper.ts
modules/geo/infrastructure/mappers/LocationRecordMapper.ts
modules/geo/infrastructure/mappers/GeofenceMapper.ts
modules/geo/infrastructure/mappers/PresenceEventMapper.ts
modules/geo/infrastructure/mappers/LocationValidationMapper.ts

modules/geo/infrastructure/supabase/SupabaseDeviceRepository.ts
modules/geo/infrastructure/supabase/SupabaseTrackingSessionRepository.ts
modules/geo/infrastructure/supabase/SupabaseLocationRepository.ts
modules/geo/infrastructure/supabase/SupabaseGeofenceRepository.ts
modules/geo/infrastructure/supabase/SupabasePresenceEventRepository.ts
modules/geo/infrastructure/supabase/SupabaseLocationValidationRepository.ts
modules/geo/infrastructure/supabase/PersonaDirectoryReader.ts

modules/geo/application/services/HaversineDistanceCalculator.ts
modules/geo/application/use-cases/devices/RegisterDevice.ts
modules/geo/application/use-cases/devices/UpdateDeviceStatus.ts
modules/geo/application/use-cases/tracking/StartTrackingSession.ts
modules/geo/application/use-cases/tracking/EndTrackingSession.ts
modules/geo/application/use-cases/locations/RecordLocation.ts
modules/geo/application/use-cases/geofences/CreateGeofence.ts
modules/geo/application/use-cases/geofences/UpdateGeofence.ts
modules/geo/application/use-cases/geofences/SetGeofenceStatus.ts
modules/geo/application/use-cases/presence/DetectPresence.ts
modules/geo/application/use-cases/validation/ValidateLocation.ts

modules/geo/presentation/api/_container.ts
modules/geo/presentation/api/_auth-context.ts

app/api/geo/devices/route.ts
app/api/geo/devices/[id]/route.ts
app/api/geo/tracking/start/route.ts
app/api/geo/tracking/end/route.ts
app/api/geo/tracking/active/route.ts
app/api/geo/locations/route.ts
app/api/geo/locations/[personaId]/route.ts
app/api/geo/geofences/route.ts
app/api/geo/geofences/[id]/route.ts
app/api/geo/presence/events/route.ts
app/api/geo/presence/current/route.ts

modules/geo/docs/GEO-02-Backend-Core-y-APIs.md   (este archivo)
```

## 9. Archivos modificados (de GEO-01, ampliaciones menores)

* `modules/geo/domain/repositories/LocationRepository.ts` — se agregó
  `findById(id)` (faltaba para que `DetectPresence` pudiera resolver el
  registro puntual sin un hack; se corrigió antes de cerrar la etapa).
* `modules/geo/infrastructure/supabase/SupabaseLocationRepository.ts` —
  implementación de `findById`.
* `modules/geo/application/use-cases/UseCaseContracts.ts` — se agregaron
  `UpdateGeofenceInput/UseCase` y `SetGeofenceStatusInput/UseCase` (no
  estaban en el catálogo original de GEO-01, necesarios para el endpoint
  `PATCH /api/geo/geofences/{id}`).

Ningún módulo fuera de `modules/geo/` y `app/api/geo/` fue tocado.

## 10. Compatibilidad con GEO-00 y GEO-01

✅ No se creó `work_orders` ni ningún claim de organización.
✅ Prefijo `geo_`, sin PostGIS, sin bus de eventos externo (todo in-process).
✅ RLS por rol + pertenencia de fila, reutilizando `is_admin()`.
✅ Ningún caso de uso ni repositorio accede a Supabase fuera de
  `infrastructure/supabase/`.
✅ Ninguna API route accede a Supabase directamente: siempre vía
  `buildGeoContainer()`.

## 11. Criterios de aceptación

✅ Registrar dispositivos.
✅ Iniciar/finalizar seguimiento.
✅ Enviar ubicaciones (con detección de presencia básica encadenada).
✅ Crear/editar/deshabilitar geocercas.
✅ Detectar entradas y salidas (versión básica).
✅ Consultar histórico.
✅ Aislamiento por rol + pertenencia de fila verificado en cada endpoint.

---

## Contexto para GEO-03

**Resumen para el siguiente agente:** el backend de GEO ya expone
endpoints funcionales bajo `app/api/geo/**`, construidos sobre
`modules/geo/`. GEO-03 (Integración Directory + Operations) debe:

1. **Formalizar la integración con Directorio** más allá del chequeo
   mínimo ya hecho por `PersonaDirectoryReader` (GEO-02): agregar
   `SyncEmployeeReference`/`ValidateUserPermission` como casos de uso
   explícitos si se necesita más que "existe y es trackeable" (ej. nombre
   para mostrar en el panel — GEO-06 lo va a necesitar, y ahí se decide si
   se resuelve con un join de solo lectura o con un DTO enriquecido).
2. **Formalizar el vínculo con `rrhh_tareas`** (el análogo actual a
   "Operations", ver GEO-00 §4 y GEO-01 §7): un caso de uso
   `LinkTrackingToTask` que, dado un `trackingSessionId` y una
   `rrhh_tareas.id`, cree una `ExternalTaskReference` y la pase a
   `ValidateLocation` (ya implementado en GEO-02, listo para recibir
   `taskType: 'RRHH_TAREA'`). **No** crear una tabla nueva: reutilizar
   `geo_location_validations.task_type`/`task_id` tal cual quedaron en
   GEO-01.
3. **Dejar preparada (sin implementar) la integración `WORK_ORDER`** para
   cuando exista un módulo Operations real — el Value Object
   `ExternalTaskReference` ya admite ese tipo, solo falta el lector
   correspondiente (equivalente a `PersonaDirectoryReader` pero para
   `work_orders`) el día que esa tabla exista.
4. **Endpoints internos** sugeridos por el prompt original
   (`/internal/geo/employees/{id}`, `/internal/geo/work-orders/link`,
   `/internal/geo/work-orders/{id}/validate`,
   `/internal/geo/work-orders/{id}/presence`) — traducir a lo que
   realmente existe: `/internal/geo/tasks/link` (vincula sesión con
   `rrhh_tareas`), `/internal/geo/tasks/{id}/validation` (dispara
   `ValidateLocation` y devuelve el resultado). Reservar el prefijo
   `work-orders` para cuando el módulo Operations exista.
5. No modificar `lib/rrhh/*` ni `app/api/rrhh/*`: la integración es de
   **lectura** desde GEO hacia RRHH (mismo principio de solo-lectura que
   `PersonaDirectoryReader`), nunca al revés.

**Prompt de continuidad:** *"Actúa como Enterprise Integration Architect y
ejecuta GEO-03 sobre el backend ya implementado en GEO-00/01/02 (ver los
tres documentos arriba). Formaliza la integración con Directorio
(`public.personas`) y con `public.rrhh_tareas` como análogo actual de
'Operations' — recordá que un módulo Operations con `work_orders` real
todavía no existe en este repositorio, así que dejá esa integración
preparada vía `ExternalTaskReference` sin crear tablas nuevas. No toques
`lib/rrhh/*` ni `app/api/rrhh/*` — la relación es de solo lectura desde
GEO."*
