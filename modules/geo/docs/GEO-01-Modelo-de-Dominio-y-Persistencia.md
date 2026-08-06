# GEO-01 — Modelo de Dominio, Base de Datos y Persistencia

> Continúa GEO-00 (`GEO-00-Documento-Funcional-y-Arquitectura.md`). No se
> redefine nada de lo ya decidido ahí (§7 referencia externa, §9 control de
> acceso por rol, §16 decisiones). Esta etapa entrega dominio + SQL,
> **sin** infraestructura Supabase, **sin** API Routes y **sin** frontend —
> eso es GEO-02.

## 1. Modelo entidad-relación (conceptual)

```
public.personas (existente, Directorio)
    |
    | 1..N
    v
geo_devices ──────────────┐
    |                      | 1..N
    | 1..N                 v
    v              geo_location_records
geo_tracking_sessions          ^
    |                          | N..1
    | 1..N                     |
    v                          |
geo_presence_events ───────────┘
    |
    | N..1
    v
geo_geofences ── (external_location_id, opcional) ──> public.locaciones (existente, Directorio)

geo_location_validations
    | N..1 (persona_id) ──> public.personas
    | N..1 (geofence_id, opcional) ──> geo_geofences
    | (task_type, task_id) ──> referencia desacoplada, sin FK (rrhh_tareas | futuro WORK_ORDER)
```

Ninguna tabla nueva referencia `public.organizaciones` directamente: la
pertenencia a un cliente se resuelve indirectamente vía
`geo_geofences.external_location_id -> public.locaciones.organizacion_id`,
sin que GEO necesite conocerlo.

## 2. Entidades de dominio implementadas

`modules/geo/domain/entities/`: `Device`, `TrackingSession`,
`LocationRecord`, `Geofence`, `PresenceEvent`, `LocationValidation`. Mismo
estilo que `modules/library` (`private constructor` + `static create` /
`static reconstitute` + métodos de negocio + getters + `toProps()`).

## 3. Value Objects

`modules/geo/domain/value-objects/`: `Coordinates` (lat/lng validados),
`GeoRadius` (10–5000 m), `LocationAccuracy` (con `isAcceptableFor(radius)`
para el control anti falso-positivo de GEO-05), `TrackingPeriod`
(inicio/fin, `durationMinutes()`), `DeviceStatus`, `TrackingSessionStatus`,
`GeofenceType`, `GeofenceStatus`, `PresenceEventType`,
`LocationValidationResult`, y `ExternalTaskReference` (reemplaza al
"WorkOrder" del prompt original — ver GEO-00 §7).

## 4. Relaciones

* `geo_devices.persona_id -> personas.id` (obligatoria).
* `geo_tracking_sessions.persona_id -> personas.id`,
  `geo_tracking_sessions.device_id -> geo_devices.id` (obligatorias).
* `geo_location_records.tracking_session_id -> geo_tracking_sessions.id`,
  `.device_id -> geo_devices.id`, `.persona_id -> personas.id`
  (desnormalizado a propósito: evita un join en las consultas de alto
  volumen por persona/dispositivo).
* `geo_geofences.external_location_id -> locaciones.id` (opcional).
* `geo_presence_events` referencia `persona_id`, `device_id`,
  `geofence_id`, `tracking_session_id` (todas obligatorias) y
  `location_record_id` (opcional, la posición puntual que disparó el
  evento).
* `geo_location_validations.persona_id -> personas.id` (obligatoria),
  `.geofence_id -> geo_geofences.id` (opcional), `task_type`/`task_id` sin
  FK (ver §7 de GEO-00).

## 5. Migraciones SQL propuestas

`modules/geo/migrations/`:

1. `0000_geo_helpers.sql` — `geo_current_persona_id()`,
   `geo_is_trackable_persona()`.
2. `0001_create_geo_devices.sql`
3. `0002_create_geo_tracking_sessions.sql`
4. `0003_create_geo_location_records.sql`
5. `0004_create_geo_geofences.sql`
6. `0005_create_geo_presence_events.sql`
7. `0006_create_geo_location_validations.sql`

Todas idempotentes (`create table if not exists`, `create index if not
exists`, `drop policy if exists` antes de recrearla), igual criterio que
`supabase/schema.sql` y `modules/library/migrations/`.

## 6. Índices

* `geo_devices(persona_id)`, `geo_devices(status)`.
* `geo_tracking_sessions(persona_id)`, `(device_id)`, e índice parcial
  `(persona_id) where status = 'ACTIVE'` para resolver rápido "¿tiene una
  jornada activa?".
* `geo_location_records(device_id, recorded_at desc)`,
  `(persona_id, recorded_at desc)`, `(tracking_session_id, recorded_at)` —
  pensados para el patrón de consulta dominante: histórico por dispositivo
  o por persona en un rango de tiempo.
* `geo_geofences(type)`, `(status)`, `(external_location_id)`.
* `geo_presence_events(persona_id, occurred_at desc)`,
  `(geofence_id, occurred_at desc)`, `(tracking_session_id)`.
* `geo_location_validations(persona_id, created_at desc)`,
  `(task_type, task_id)`.

## 7. Decisión geoespacial (confirmación de GEO-00 §16.5)

**No se adopta PostGIS.** Lat/lng como `numeric(9,6)` (precisión ~11 cm,
más que suficiente para geocercas de 10–5000 m). El cálculo de distancia
(Haversine) se implementa en TypeScript en la capa de aplicación/motor
(GEO-02 para el cálculo puntual, GEO-05 para la máquina de estados
OUTSIDE→ENTERING→INSIDE→LEAVING que lo consume). Los índices por
`device_id`/`persona_id` + tiempo acotan el conjunto de candidatos antes de
cualquier cálculo exacto — no se necesita un índice espacial para el
volumen esperado (personal de limpieza/mantenimiento evaluado contra un
puñado de geocercas activas, no miles de vehículos en tiempo real).

## 8. Seguridad — RLS (reemplaza el patrón roto de Library)

Todas las tablas tienen RLS habilitado con dos policies:

1. **Admin** (`public.is_admin()`, ya existente): acceso total (`for all`).
2. **Persona propia** (`persona_id = public.geo_current_persona_id()`):
   solo lectura en la mayoría de las tablas; en
   `geo_tracking_sessions` también puede insertar/actualizar sus propias
   sesiones (inicio/fin de jornada desde la PWA); en
   `geo_location_records` también puede insertar sus propias posiciones
   (aunque GEO-00 §11 documenta que la ingesta de producción preferirá
   Service Role para evitar fricción de RLS a alta frecuencia).

`geo_geofences` y `geo_presence_events`/`geo_location_validations` (salvo
lectura propia) son de gestión exclusiva de Admin/Super Admin: el
dispositivo no lee geocercas ni escribe eventos/validaciones directamente,
consistente con GEO-04 ("el dispositivo solo captura") y GEO-05 (el motor
server-side es quien genera eventos y validaciones).

**Corrección explícita respecto al bug ya presente en Library:** ninguna
policy referencia `organization_id` ni `auth.jwt() ->> 'organization_id'`
(no existen). Todas usan `public.is_admin()` o
`public.geo_current_persona_id()`, ambas funciones reales, verificadas
contra `supabase/schema.sql` y probadas de compilar en este mismo
documento.

## 9. Repositorios (interfaces de dominio)

`modules/geo/domain/repositories/`: `DeviceRepository`,
`TrackingSessionRepository`, `LocationRepository`, `GeofenceRepository`,
`PresenceEventRepository`, `LocationValidationRepository`. Solo
interfaces — las implementaciones Supabase (`Supabase*Repository`) se
construyen en GEO-02, igual que `modules/library/infrastructure/supabase/`.

## 10. Casos de uso preparados (interfaces)

`modules/geo/application/use-cases/UseCaseContracts.ts`:
`RegisterDeviceUseCase`, `UpdateDeviceStatusUseCase`,
`StartTrackingSessionUseCase`, `EndTrackingSessionUseCase`,
`RecordLocationUseCase`, `CreateGeofenceUseCase`, `DetectPresenceUseCase`,
`ValidateLocationUseCase`. Cada una define su `Input`/`Output` y un método
`execute()`. La implementación (clases concretas que reciben repositorios
por constructor, como `DeleteDocument` en Library) se hace en GEO-02.

## 11. Eventos de dominio (payload conceptual, sin publicación aún)

```
TrackingSessionStarted   { trackingSessionId, personaId, deviceId, startedAt }
TrackingSessionEnded     { trackingSessionId, personaId, endedAt, durationMinutes }
LocationRecorded         { locationRecordId, trackingSessionId, personaId, recordedAt }
EmployeeArrivedLocation  { presenceEventId, personaId, geofenceId, occurredAt }
EmployeeLeftLocation     { presenceEventId, personaId, geofenceId, occurredAt }
EmployeeStayedLocation   { personaId, geofenceId, startedAt, endedAt, durationMinutes }
PresenceValidated        { locationValidationId, personaId, result }
LocationDeviationDetected{ locationValidationId, personaId, reason }
```

Sin bus de eventos (GEO-00 §16.6): en GEO-02 estos payloads se emiten como
llamadas in-process desde los casos de uso.

## 12. Verificación de compilación

Se compiló `modules/geo/**/*.ts` de forma aislada con TypeScript 7 en modo
`strict` (mismas opciones relevantes que `tsconfig.json` del repo:
`strict: true`, `esModuleInterop`, `moduleResolution: bundler`,
`isolatedModules`). **0 errores.** No se usó `any` en ningún archivo.

## 13. Archivos creados

```
modules/geo/domain/entities/Device.ts
modules/geo/domain/entities/TrackingSession.ts
modules/geo/domain/entities/LocationRecord.ts
modules/geo/domain/entities/Geofence.ts
modules/geo/domain/entities/PresenceEvent.ts
modules/geo/domain/entities/LocationValidation.ts

modules/geo/domain/value-objects/Coordinates.ts
modules/geo/domain/value-objects/GeoRadius.ts
modules/geo/domain/value-objects/LocationAccuracy.ts
modules/geo/domain/value-objects/TrackingPeriod.ts
modules/geo/domain/value-objects/DeviceStatus.ts
modules/geo/domain/value-objects/TrackingSessionStatus.ts
modules/geo/domain/value-objects/GeofenceType.ts
modules/geo/domain/value-objects/GeofenceStatus.ts
modules/geo/domain/value-objects/PresenceEventType.ts
modules/geo/domain/value-objects/LocationValidationResult.ts
modules/geo/domain/value-objects/ExternalTaskReference.ts

modules/geo/domain/errors/GeoErrors.ts

modules/geo/domain/repositories/DeviceRepository.ts
modules/geo/domain/repositories/TrackingSessionRepository.ts
modules/geo/domain/repositories/LocationRepository.ts
modules/geo/domain/repositories/GeofenceRepository.ts
modules/geo/domain/repositories/PresenceEventRepository.ts
modules/geo/domain/repositories/LocationValidationRepository.ts

modules/geo/application/dto/GeoDTO.ts
modules/geo/application/use-cases/UseCaseContracts.ts

modules/geo/migrations/0000_geo_helpers.sql
modules/geo/migrations/0001_create_geo_devices.sql
modules/geo/migrations/0002_create_geo_tracking_sessions.sql
modules/geo/migrations/0003_create_geo_location_records.sql
modules/geo/migrations/0004_create_geo_geofences.sql
modules/geo/migrations/0005_create_geo_presence_events.sql
modules/geo/migrations/0006_create_geo_location_validations.sql

modules/geo/docs/GEO-01-Modelo-de-Dominio-y-Persistencia.md   (este archivo)
```

Ningún archivo existente fue modificado (GEO-01 no toca `supabase/schema.sql`
ni ningún módulo previo, tal como exige el prompt).

## 14. Compatibilidad con GEO-00

* Respeta §3-4 (límites del dominio, GEO no duplica Directorio/RRHH).
* Respeta §7 (`ExternalTaskReference` en vez de `WorkOrder`).
* Respeta §9-10 (RLS por rol + pertenencia de fila, no JWT de organización).
* Respeta §16 (prefijo `geo_`, sin PostGIS, sin bus de eventos, reutiliza
  `is_admin()`).

## 15. Criterios de aceptación

✅ Modelo ER definido y coherente con el esquema real de FACILIA.
✅ 6 entidades de dominio + 11 Value Objects + jerarquía de errores.
✅ 7 migraciones SQL idempotentes con RLS e índices.
✅ 6 interfaces de repositorio.
✅ 8 interfaces de caso de uso.
✅ Payload de 8 eventos de dominio documentado.
✅ Compila en `strict` sin errores y sin `any`.

---

## Contexto para GEO-02

**Resumen para el siguiente agente:** el dominio de GEO ya está completo en
`modules/geo/domain/` y las migraciones en `modules/geo/migrations/`
(ejecutarlas en orden 0000→0006 en Supabase SQL Editor). GEO-02 debe
implementar:

1. **`modules/geo/infrastructure/supabase/`** — una clase
   `Supabase<Entidad>Repository` por cada interfaz de
   `modules/geo/domain/repositories/`, siguiendo exactamente el patrón de
   `modules/library/infrastructure/supabase/SupabaseDocumentRepository.ts`
   (constructor recibe `SupabaseClient`, tabla = constante `TABLE`, mapeo
   vía un `*Mapper` en `modules/geo/infrastructure/mappers/`).
2. **`modules/geo/infrastructure/mappers/`** — un `*Mapper` por entidad con
   `toDomain(row)`, `toRow(entity)`, `toDTO(entity)`, análogo a
   `DocumentMapper.ts`. Las columnas ya están fijadas por las migraciones
   (ver §5-6 de este documento y el SQL de cada tabla).
3. **`modules/geo/application/use-cases/<grupo>/`** — implementación
   concreta de cada interfaz definida en `UseCaseContracts.ts` (clases con
   `constructor(repos...)` + `execute(input)`), reorganizadas en
   subcarpetas `devices/`, `tracking/`, `locations/`, `geofences/` si se
   prefiere (Library usa `documents/`/`folders/`; GEO puede replicar ese
   criterio).
4. **`modules/geo/presentation/api/`** — API Routes de Next.js
   (`GET/POST/PATCH`), un `_container.ts` (construye todos los casos de uso
   a partir de un `SupabaseClient`) y un `_auth-context.ts` con
   `requireTrackableEmployee()` (resuelve `persona_id` desde la sesión,
   usando `lib/serverAuth.ts` y `lib/supabase/server.ts` **reales** —
   `createClient`, `createServiceClient`, `requireAuth`, `requireAdmin`;
   **no** inventar `createServerSupabaseClient`, ver GEO-00 §11).
5. **Endpoints** (ver GEO-02 del prompt original): `GET/POST/PATCH
   /api/geo/devices`, `POST /api/geo/tracking/start|end`, `GET
   /api/geo/tracking/active`, `POST /api/geo/locations` (usar
   `createServiceClient()` para la ingesta de alta frecuencia, validando la
   sesión del dispositivo en la capa de aplicación antes de usarlo — ver
   GEO-00 §11), `GET /api/geo/locations/{persona_id}`, `GET/POST/PATCH
   /api/geo/geofences`, `GET /api/geo/presence/events`, `GET
   /api/geo/presence/current`.
6. **Detección de presencia básica** (entrada/salida por comparación directa
   distancia vs. radio, sin la máquina de estados completa OUTSIDE→
   ENTERING→INSIDE→LEAVING ni los controles anti falso-positivo — eso es
   GEO-05). GEO-02 puede implementar una versión simple de
   `DetectPresenceUseCase` que sirva de base.

No crear tablas nuevas en GEO-02 (todo el modelo ya está en GEO-01). No
introducir PostGIS ni JWT de organización (decisiones cerradas, GEO-00
§16).

**Prompt de continuidad:** *"Actúa como Senior Backend Architect y ejecuta
GEO-02 sobre el dominio y las migraciones ya definidos en GEO-00 y GEO-01
(ver ambos documentos arriba). No rediseñes entidades, Value Objects ni el
esquema SQL; implementa los repositorios Supabase, los mappers, los casos de
uso concretos y las API Routes, reutilizando `lib/supabase/server.ts` y
`lib/serverAuth.ts` tal como existen hoy en el repo — sin inventar helpers
que no existen."*
