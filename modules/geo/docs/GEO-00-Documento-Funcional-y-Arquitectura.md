# GEO-00 — Documento Funcional y Arquitectura del Módulo GEO (FACILIA)

> Ejecuta el prompt GEO-00 sobre la arquitectura **real** del repositorio FACILIA
> (Next.js 14 App Router + Supabase/Postgres), no sobre una arquitectura SaaS
> multi-tenant genérica. Ver §0 para las adaptaciones necesarias.

## 0. Adaptaciones respecto al prompt original (lectura obligatoria)

El prompt GEO-00..GEO-CLOSE fue redactado asumiendo un SaaS multi-tenant con
aislamiento de datos por `organization_id` vía claim de JWT y un módulo
"Operations" con órdenes de trabajo ya existente. Al auditar el repositorio
real (`SONNET2.zip`) aparecen dos diferencias de fondo que GEO debe respetar
en lugar de contradecir:

1. **FACILIA no es multi-tenant en el sentido SaaS.** Es un único deployment
   Supabase. Los roles (`super_admin`, `admin`, `colaborador`, `personal`,
   `usuario`) son globales y viven en `public.profiles`. La tabla
   `public.organizaciones` no representa "tenants" del sistema — representa
   **clientes/proveedores de FACILIA** (un dato de negocio, no una frontera de
   aislamiento técnico). No existe ningún claim `organization_id` en el JWT.
   GEO **no debe** inventar ese mecanismo (el módulo Library sí lo hizo —
   referencia `public.organizations` y `auth.jwt() ->> 'organization_id'`,
   ninguno de los dos existe realmente — es un bug conocido que GEO no debe
   heredar).
2. **El módulo "Operations" (órdenes de trabajo) todavía no existe.** Lo más
   cercano hoy es `public.rrhh_tareas` (tarea simple: `persona_id`,
   `locacion_id`, `fecha`, `estado`), sin horario planificado ni cliente
   explícito. GEO-03 en adelante debe integrarse contra una **referencia
   externa desacoplada** (tipo + id), no contra una tabla `work_orders` que
   no existe.

Toda decisión de este documento y de las etapas siguientes (GEO-01 a
GEO-CLOSE) se basa en estas dos correcciones. Donde el prompt original dice
"organización" en sentido de tenant SaaS, este documento lo traduce a
**"aislamiento por rol + pertenencia real del dato"**.

---

## 1. Objetivo del módulo

GEO — *Geopositioning & Workforce Control* — es el módulo responsable de
registrar, interpretar y validar la posición geográfica del personal
operativo de FACILIA (limpieza, mantenimiento, continuidad operativa) que
usa un dispositivo móvil provisto por la empresa, para transformar:

```
Persona (personal_facilia)
+ Dispositivo
+ Horario laboral
+ Tarea/Orden asignada (cuando exista)
+ Ubicación del cliente (Locación)
+ Posición GPS
```

en eventos operativos verificables (llegada, permanencia, salida,
cumplimiento horario, desvío).

## 2. Propósito empresarial

* Trazabilidad operacional de servicios prestados en sitio.
* Control de cumplimiento horario del personal.
* Evidencia objetiva de presencia, sustituyendo el reporte manual.
* Transparencia hacia clientes corporativos (futuro: portal cliente).
* Insumo de supervisión para Administradores y Supervisores.

## 3. Principio arquitectónico

GEO es un **módulo autocontenido** en `modules/geo/`, siguiendo exactamente
el patrón Clean Architecture ya validado por `modules/library/` (Charlie
Compliant: DDD + Clean Architecture + Repository Pattern + Casos de Uso +
RLS).

```
modules/geo/
  domain/          -> Entidades, Value Objects, interfaces de Repository, errores. Sin dependencias externas.
  application/     -> Casos de uso (orquestación), DTOs. Depende solo de domain.
  infrastructure/  -> Implementaciones Supabase, mapeo DB<->dominio, constantes. Implementa interfaces de domain.
  presentation/    -> API Routes (Next.js Route Handlers).
  migrations/      -> SQL versionado por etapa (0001_*.sql, 0002_*.sql, ...).
  docs/            -> Documentos de arquitectura y contexto entre etapas (este archivo).
```

Regla de dependencia: `presentation -> application -> domain`, e
`infrastructure -> domain`. Ningún endpoint accede a Supabase directamente:
siempre pasa por un caso de uso obtenido de un `_container.ts` (mismo patrón
que `modules/library/presentation/api/_container.ts`).

### GEO NO administra

* personas (`public.personas`);
* organizaciones/clientes (`public.organizaciones`);
* locaciones/sedes (`public.locaciones`);
* roles y sesiones (`public.profiles`, Supabase Auth);
* tareas/órdenes (`public.rrhh_tareas`, ni el futuro Operations);
* contratos, precios, cotizaciones.

Todo lo anterior pertenece a otros dominios y GEO solo lo **referencia por
id**, nunca lo duplica ni lo modifica.

### GEO administra (dominio propio)

* dispositivos corporativos (`geo_devices`);
* sesiones de tracking (`geo_tracking_sessions`);
* posiciones capturadas (`geo_location_records`);
* geocercas (`geo_geofences`);
* eventos de presencia (`geo_presence_events`);
* validaciones de presencia/llegada (`geo_location_validations`);
* el vínculo desacoplado con tareas externas (`geo_external_task_links`,
  ver §7).

## 4. Relación con otros módulos reales de FACILIA

### Directorio (`public.personas`, `public.organizaciones`, `public.locaciones`, `public.profiles`)

Fuente maestra de personas y sedes. GEO solo puede iniciar tracking para una
**persona trackeable**, definida como:

```
personas.tipo = 'personal_facilia'
AND personas.profile_id IS NOT NULL   -- tiene login
AND personas.estado_laboral = 'activo'
```

Las geocercas de tipo `CLIENT_LOCATION` referencian `locaciones.id`
(opcional: puede haber geocercas `CUSTOM` sin locación asociada, ej. un
punto de control temporal). Las de tipo `OFFICE`/`WAREHOUSE` referencian
sedes propias de FACILIA, modeladas también como filas de `locaciones` con
`organizacion_id` apuntando a la organización interna de FACILIA (o, si no
existe ese registro semilla, como geocerca sin locación con nombre libre —
decisión a confirmar en GEO-01).

### RRHH — analogía actual de "tarea asignada" (`public.rrhh_tareas`)

No es el "Operations" del prompt original, pero es lo único hoy relacionable
con "trabajo planificado en un sitio". GEO puede opcionalmente vincular una
`TrackingSession` o un `PresenceEvent` a una `rrhh_tareas.id` vía la
referencia externa genérica de §7, sin crear una FK real (para no acoplar
GEO a un módulo que puede cambiar de forma).

### Operations (futuro, no existe aún)

Se deja **preparada** la misma referencia externa genérica (`taskType =
'WORK_ORDER'`) para cuando exista. GEO no bloquea su propio desarrollo
esperando ese módulo.

### Library (futuro)

Uso futuro para adjuntar evidencias (capturas de pantalla, fotos de
check-in) a un `PresenceEvent`, vía el mismo mecanismo `DocumentLinkService`
que ya usan otros módulos (`entityType='geo_presence_event'`).

## 5. Casos de uso principales

1. **Inicio de jornada** — la persona (empleado con login) abre la PWA GEO,
   se autentica con el sistema existente FACILIA, se registra/confirma el
   dispositivo y arranca una `TrackingSession`.
2. **Registro de ubicación** — durante la jornada, el dispositivo envía
   posiciones (lat/lng/precisión/timestamp) periódicamente.
3. **Llegada a cliente** — la posición entra en el radio de una `Geofence`
   activa → evento `EmployeeArrivedLocation`.
4. **Permanencia** — mientras la posición sigue dentro del radio, se acumula
   tiempo de presencia, comparable contra un mínimo esperado.
5. **Salida** — la posición sale del radio → evento `EmployeeLeftLocation`.
6. **Incumplimiento** — la hora de llegada real excede la planificada (si hay
   una referencia de tarea vinculada) → `LocationDeviationDetected`.

## 6. Modelo conceptual (entidades del dominio GEO)

### Device

Dispositivo móvil corporativo. Se asocia a una persona (`persona_id`), no a
un "usuario" abstracto. Estados: `ACTIVE`, `INACTIVE`, `LOST`, `BLOCKED`,
`RETIRED`.

### TrackingSession

Período activo de seguimiento de una persona con un dispositivo. Estados:
`ACTIVE`, `PAUSED`, `ENDED`, `CANCELLED`.

### LocationRecord

Una posición capturada: lat, lng, precisión, timestamp, `tracking_session_id`.
Alto volumen — diseñado para crecer sin rediseño (ver GEO-01 §performance).

### Geofence

Zona autorizada. Tipos: `CLIENT_LOCATION`, `OFFICE`, `WAREHOUSE`, `CUSTOM`.
Referencia opcional a `locaciones.id` (`external_location_id`), nunca copia
sus datos (nombre, dirección quedan en Directorio; GEO solo guarda centro y
radio propios, que pueden diferir levemente del punto exacto de la locación
por razones prácticas de geocerca).

### PresenceEvent

Evento discreto dentro de una geocerca: `ENTER`, `EXIT`, `STAY`, `UNKNOWN`.

### LocationValidation

Resultado de cruzar hora planificada (si existe, vía referencia externa) vs.
hora real de llegada/permanencia. Estados: `VALIDATED`, `PARTIAL`, `FAILED`,
`PENDING`.

## 7. Referencia externa desacoplada (reemplaza "WorkOrder" del prompt original)

Para no acoplar GEO a una tabla `work_orders` inexistente ni a la forma
actual (probablemente transitoria) de `rrhh_tareas`, se define un Value
Object de dominio:

```
ExternalTaskReference {
  taskType: 'RRHH_TAREA' | 'WORK_ORDER' | 'NONE'
  taskId: string | null
}
```

Se persiste como columnas simples (`task_type`, `task_id`) sin FK de base de
datos (porque `WORK_ORDER` no tiene tabla destino todavía). La validación de
que `task_id` existe, cuando `taskType = 'RRHH_TAREA'`, se hace en la capa de
aplicación (Use Case), no con una constraint SQL. Cuando exista un módulo
Operations real, se agrega `'WORK_ORDER'` con su propia validación sin tocar
el modelo GEO.

## 8. Reglas de negocio iniciales

* **Regla de jornada**: la captura de ubicación solo se ejecuta dentro de una
  `TrackingSession` en estado `ACTIVE`.
* **Regla de persona trackeable**: solo personas `tipo='personal_facilia'`,
  con `profile_id` y `estado_laboral='activo'` pueden iniciar tracking.
* **Regla de geocerca**: presente cuando `distancia_gps <= radio_permitido`.
* **Regla de referencia externa**: una validación solo se genera si existe
  una `ExternalTaskReference` distinta de `NONE`, o contra el simple
  cumplimiento de geocerca/horario de jornada si no hay tarea vinculada.
* **Regla de auditoría**: toda escritura administrativa (alta de
  dispositivo, geocerca, cambio de estado) registra `created_by`/`updated_by`
  (uuid de `profiles.id`) y `created_at`/`updated_at`, igual que el resto de
  FACILIA.

## 9. Privacidad, seguridad y control de acceso (adaptado al modelo real de roles)

Sin JWT de organización, el control de acceso de GEO se hace **por rol
global**, igual que el resto de FACILIA (`lib/serverAuth.ts`):

| Acción | Roles permitidos |
|---|---|
| Ver su propio tracking/jornada | la propia persona (`personal`, cualquier rol con `persona_id` propio) |
| Ver tracking de todo el personal, gestionar geocercas y dispositivos | `super_admin`, `admin` |
| Ver tracking de personal bajo su responsabilidad (futuro rol "Supervisor") | fuera de alcance MVP — hoy se trata como `admin`/`colaborador` (ver GEO-06) |
| Cliente ve cumplimiento de sus propios servicios | fuera de alcance, futuro |

RLS en Postgres se define sobre la fila real (`persona_id = current persona`)
en vez de sobre un claim de organización inexistente. El detalle exacto de
políticas se define en GEO-01.

## 10. Multi-"tenancy" real de FACILIA

No hay aislamiento de datos entre organizaciones cliente a nivel de fila de
GEO — todos los datos de tracking pertenecen a FACILIA como operador único.
Lo que sí existe es **pertenencia de dato a una locación de un cliente
específico** (`locacion_id` de la geocerca), útil para reportes por cliente,
pero no es una frontera de seguridad multi-tenant. Este documento reemplaza
toda mención de "múltiples organizaciones" del prompt original por
"múltiples locaciones de cliente bajo un mismo operador FACILIA".

## 11. Arquitectura técnica esperada

Idéntica a Library: Domain / Application / Infrastructure / API, dentro de
`modules/geo/`, usando:

* `@supabase/supabase-js` vía `lib/supabase/server.ts` → `createClient()`
  (sesión de cookies, para endpoints que actúan "como la persona logueada")
  y `createServiceClient()` (service role, para el endpoint de alta
  frecuencia de ingestión GPS desde la PWA móvil, evitando fricción de RLS
  en escritura masiva, con validación de sesión hecha igual en la capa de
  aplicación antes de usar el cliente de servicio).
* `lib/serverAuth.ts` (`requireAuth`, `requireAdmin`) reutilizado tal cual;
  GEO agrega un helper propio `requireTrackableEmployee()` en
  `modules/geo/presentation/api/_auth-context.ts` que resuelve la
  `persona_id` activa a partir de la sesión.
* TypeScript strict, sin `any`, sin código nuevo en esta etapa (GEO-00 es
  solo documentación, por instrucción explícita del prompt).

## 12. Eventos de dominio iniciales

```
TrackingSessionStarted
TrackingSessionEnded
LocationRecorded
EmployeeArrivedLocation
EmployeeLeftLocation
EmployeeStayedLocation
PresenceValidated
LocationDeviationDetected
```

En esta etapa (GEO-00) se modelan solo conceptualmente (nombre + payload
esperado). La implementación real (publicación in-process, sin bus de
eventos externo — no existe infraestructura de mensajería en el repo) se
resuelve en GEO-02.

## 13. MVP recomendado (GEO-01 a GEO-05)

✅ registrar dispositivos
✅ registrar ubicación
✅ asociar dispositivo-persona
✅ crear geocercas
✅ validar presencia básica
✅ cruzar con `rrhh_tareas` cuando exista vínculo (mejor esfuerzo, sin bloquear si no hay tarea)

## 14. Fuera de alcance (todas las etapas)

Rutas, navegación, optimización de rutas, IA/predicción, reconocimiento
facial, biometría, seguimiento permanente fuera de jornada, gestión de
flota, portal cliente, WebSockets/tiempo real (queda para GEO 2.0 en
GEO-CLOSE).

## 15. Roadmap GEO-01 a GEO-CLOSE

| Etapa | Contenido | Genera código |
|---|---|---|
| GEO-00 | Este documento | No |
| GEO-01 | Modelo de dominio + migraciones SQL + repositorios (interfaces) | Sí (dominio + SQL) |
| GEO-02 | Backend core: casos de uso, repos Supabase, API Routes | Sí |
| GEO-03 | Integración con Directorio y con la referencia externa de tareas (§7) | Sí |
| GEO-04 | PWA móvil de captura GPS | Sí |
| GEO-05 | Motor de geocercas y validaciones operativas | Sí |
| GEO-06 | Panel Supervisor (solo lectura sobre lo ya construido) | Sí |
| GEO-CLOSE | Cierre, congelamiento de arquitectura, documentación final | Solo correcciones puntuales |

## 16. Decisiones arquitectónicas iniciales (ADR resumido)

1. **No se introduce multi-tenancy por JWT.** Se usa control de acceso por
   rol global + pertenencia de fila (`persona_id`), consistente con el resto
   de FACILIA. *(Desvío consciente del prompt genérico, ver §0, §9, §10.)*
2. **No se crea tabla `work_orders`.** Se usa una referencia externa
   desacoplada (`task_type` + `task_id`), sin FK, validada en capa de
   aplicación. *(Desvío consciente del prompt genérico, ver §7.)*
3. **Se reutilizan los helpers de auth existentes** (`lib/supabase/server.ts`,
   `lib/serverAuth.ts`) tal como están definidos hoy en el repo — sin asumir
   nombres de funciones que no existen (corrige el patrón ya roto en
   Library).
4. **Prefijo de tablas `geo_`** para todas las tablas nuevas, siguiendo el
   mismo criterio que `library_*` y `rrhh_*`.
5. **PostGIS: no se adopta en el MVP.** El volumen esperado (personal de
   limpieza/mantenimiento, no miles de vehículos en tiempo real) no justifica
   la complejidad operativa de PostGIS en Supabase todavía. Se usa Haversine
   calculado en la capa de aplicación (TypeScript) sobre columnas `numeric`
   de lat/lng, con índice B-tree compuesto para acotar candidatos antes del
   cálculo exacto. Se documenta como decisión revisable si el volumen crece
   (GEO-CLOSE, roadmap GEO 2.x).
6. **Sin bus de eventos externo.** Los eventos de dominio (§12) se
   implementan como llamadas in-process desde los casos de uso (mismo
   patrón, o ausencia de patrón, que el resto del repo — no hay
   infraestructura de colas/eventos instalada). Preparado para extraerse a
   un dispatcher real si en el futuro se necesita.

## 17. Entregables de esta etapa

* Este documento (`GEO-00-Documento-Funcional-y-Arquitectura.md`).
* Sin código, sin SQL, sin implementación — por instrucción explícita del
  prompt GEO-00.

## 18. Criterio de aceptación

✅ Queda claro qué responsabilidad tiene GEO y cuáles son de Directorio/RRHH.
✅ Queda claro que "Operations" no existe aún y cómo GEO se prepara para él
  sin bloquearse.
✅ Queda claro cómo se cruza ubicación con tarea (referencia desacoplada).
✅ Queda claro cómo se protege la información (rol + pertenencia de fila, no
  JWT de organización).
✅ Queda definido el roadmap GEO-01 a GEO-CLOSE.

---

## Contexto para GEO-01

**Resumen para el siguiente agente:** el módulo GEO se construye en
`modules/geo/`, clonando el patrón Clean Architecture ya usado por
`modules/library/` (mismas 4 capas, mismo estilo de entidades con
`private constructor` + `static create`/`static reconstitute`, mismo estilo
de Value Objects inmutables con validación en `create()`, mismo estilo de
`_container.ts` y `_auth-context.ts`).

Entidades a modelar en GEO-01: `Device`, `TrackingSession`,
`LocationRecord`, `Geofence`, `PresenceEvent`, `LocationValidation`. Todas
referencian `persona_id` (no "employee_id" ni "user_id" separados — en
FACILIA la persona rastreable **es** `public.personas.id`, con
`profile_id` no nulo y `tipo='personal_facilia'`). Las geocercas referencian
opcionalmente `locaciones.id` vía `external_location_id`. La relación con
tareas usa el Value Object `ExternalTaskReference` (`task_type` +
`task_id`, sin FK) descrito en §7 — **no crear una tabla `work_orders`**.

Tablas nuevas con prefijo `geo_`: `geo_devices`, `geo_tracking_sessions`,
`geo_location_records`, `geo_geofences`, `geo_presence_events`,
`geo_location_validations`. Todas con `id uuid default gen_random_uuid()`,
`created_at`/`updated_at timestamptz`, y donde aplique `created_by`/
`updated_by uuid references public.profiles(id)`. RLS por rol
(`super_admin`/`admin` ven todo; una persona ve solo sus propias filas vía
`persona_id`), **sin** ninguna referencia a `organization_id` ni a
`public.organizations` (esa tabla no existe — la real es
`public.organizaciones`, que GEO no necesita tocar directamente porque no
hay aislamiento por organización).

No usar PostGIS (ver §16.5): Haversine en aplicación, con índice compuesto
`(device_id, created_at)` / `(persona_id, created_at)` en
`geo_location_records` para acotar rangos.

Auth: reusar `lib/supabase/server.ts` (`createClient`, `createServiceClient`
— **no** `createServerSupabaseClient`, ese nombre no existe en el repo) y
`lib/serverAuth.ts` (`requireAuth`, `requireAdmin`). Agregar
`requireTrackableEmployee()` propio de GEO.

**Prompt de continuidad:** *"Actúa como Senior Domain Architect y ejecuta
GEO-01 sobre la arquitectura ya definida en GEO-00 (ver arriba). No
rediseñes nada de lo ya decidido en §7, §9, §10 y §16; implementa el
dominio (entidades, Value Objects, interfaces de Repository), las
migraciones SQL en `modules/geo/migrations/`, y los índices, respetando el
esquema real de FACILIA (`personas`, `locaciones`, `profiles`) y sin crear
`work_orders` ni ningún claim de `organization_id`."*
