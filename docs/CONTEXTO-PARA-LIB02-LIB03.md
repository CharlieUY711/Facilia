# Contexto para LIB-02 y LIB-03 — Módulo Library (FACILIA)

> Este documento resume todo lo ejecutado en **LIB-00** (arquitectura) y **LIB-01** (dominio, base de datos, storage, backend, APIs) para que otro agente pueda continuar directamente con **LIB-02** (frontend) y **LIB-03** (seguridad/ACL/auditoría/integración) sin repetir el análisis ni modificar lo ya construido.

---

## 1. Qué existe hoy (estado real del proyecto)

### 1.1 LIB-00 — Arquitectura (documento, sin código)
Definió: dos repositorios únicos (`PUBLIC` / `PRIVATE`), carpetas jerárquicas sin límite de profundidad, documentos sin duplicación (vínculos polimórficos a cualquier entidad de FACILIA), modelo DDD completo, modelo ER conceptual, contrato de APIs REST, estrategia de Storage con dos buckets, y arquitectura *preparada* (no implementada) para ACL, compartición, auditoría y versionado. Documento completo: `docs/LIB-00-Arquitectura-Funcional.md`.

### 1.2 LIB-01 — Dominio, Base de Datos y Backend (implementado)

**Migraciones SQL generadas** (`migrations/`):
- `0001_create_library_folders.sql` — tabla `library_folders` (jerarquía self-referencing, RLS básica por organización).
- `0002_create_library_documents.sql` — tabla `library_documents` (metadatos completos, soft delete, RLS básica por organización).
- `0003_create_library_document_links.sql` — tabla `library_document_links` (vínculo polimórfico documento↔entidad, con RLS de lectura).

**Dominio** (`modules/library/domain/`):
- Entidades: `Document`, `Folder`, `DocumentReference`.
- Value Objects: `RepositoryType`, `Visibility`, `DocumentStatus`, `FileMetadata`, `StorageLocation`, `EntityReference`.
- Errores de dominio: `LibraryDomainError` y subclases (`DocumentNotFoundError`, `FolderNotFoundError`, `OrganizationMismatchError`, etc.).
- Interfaces de repositorio: `DocumentRepository`, `FolderRepository`, `StorageRepository`, `DocumentLinkRepository`.

**Aplicación** (`modules/library/application/`):
- Casos de uso de carpetas: `CreateFolder`, `RenameFolder`, `DeleteFolder`, `ListFolders`.
- Casos de uso de documentos: `UploadDocument`, `GetDocument`, `ListDocuments`, `SearchDocuments`, `MoveDocument`, `DeleteDocument`, `DownloadDocument`, `LinkDocument`, `UnlinkDocument`.
- DTOs: `DocumentDTO`, `FolderDTO`.

**Infraestructura** (`modules/library/infrastructure/`):
- `SupabaseDocumentRepository`, `SupabaseFolderRepository`, `SupabaseStorageRepository`, `SupabaseDocumentLinkRepository` — implementan las interfaces de dominio.
- `DocumentMapper`, `FolderMapper` — traducen filas de Supabase ↔ entidades de dominio ↔ DTOs.
- Constantes: `PUBLIC_LIBRARY_BUCKET = "public-library"`, `PRIVATE_LIBRARY_BUCKET = "private-library"`, `SIGNED_URL_EXPIRATION_SECONDS`.
- Estrategia de path de storage: `{organization_id}/{repository_type}/{folder_id|root}/{document_id}.{extension}`.

**Presentación / API REST** (`modules/library/presentation/api/`):
```
GET    /api/library/documents            (soporta ?search=, ?repositoryType=, ?folderId=, ?extension=, paginación)
PATCH  /api/library/documents             (mover documento: body { documentId, newFolderId })
GET    /api/library/documents/:id
DELETE /api/library/documents/:id         (soft delete)
GET    /api/library/folders               (?repositoryType=, ?parentFolderId=)
POST   /api/library/folders
PATCH  /api/library/folders/:id           (rename)
DELETE /api/library/folders/:id
POST   /api/library/upload                (multipart/form-data: file, repositoryType, folderId, visibility, title, description)
GET    /api/library/download/:id          (retorna { url, fileName } con Signed URL)
POST   /api/library/link                  (body { documentId, entityType, entityId })
DELETE /api/library/link                  (body { documentId, entityType, entityId })
```
Todos los endpoints resuelven autenticación/organización vía `_auth-context.ts` y obtienen casos de uso vía `_container.ts` (`buildLibraryContainer`). **Ningún endpoint accede al repositorio Supabase directamente.**

**Notas de integración con el repo real de FACILIA:**
- `_auth-context.ts` importa `createServerSupabaseClient` desde `@/lib/supabase/server`, que debe existir (o adaptarse) según el helper estándar real del proyecto FACILIA.
- El upload usa `formData()` de Next.js Route Handlers (`runtime = "nodejs"`), compatible con App Router.
- Las 45 archivos TypeScript generados fueron verificados sintácticamente (0 errores de parseo). La verificación de tipos completa requiere el repositorio real de FACILIA con sus `tsconfig`, tipos de Supabase y helpers (`@/lib/supabase/server`), que no existen en este entorno aislado.

**Explícitamente NO implementado en LIB-01** (según alcance): frontend, tabla estándar, drag & drop, preview, ACL, versionado, auditoría.

---

### 1.3 Auditoría post-implementación — esquema real vs. asumido (IMPORTANTE)

Al intentar correr las migraciones originales de LIB-01 contra la base real de FACILIA,
se detectó que **las tablas `library_folders`, `library_documents` y `library_document_links`
ya existían** con un esquema distinto al asumido en el diseño de LIB-00. Se auditó la base
real (introspección de `information_schema` y `pg_policies`) y se corrigió todo el código
para reflejar exactamente lo que existe. Diferencias clave:

| Aspecto | Asumido en LIB-00/LIB-01 (incorrecto) | Real en la base FACILIA |
|---|---|---|
| Columna de organización | `organization_id` | `organizacion_id` (**nullable**) |
| Nombre/descripción de carpeta | `name`, `description`, `sort_order` | `nombre`, `descripcion`, `orden` |
| Valores de `repository_type` / `visibility` | `'PUBLIC'` / `'PRIVATE'` | `'publica'` / `'privada'` (CHECK constraint) |
| Estado activo/eliminado de documento | columna `status` | no existe; se deriva de `deleted_at` (NULL = activo) |
| `library_document_links.entity_id` | asumido genérico | `uuid` (ya coincidía) |
| Aislamiento por organización en RLS | asumido (aislamiento por organización propietaria) | **no existe**: la RLS real es por rol global (`is_admin()`, `is_library_staff()`, ambas sobre `profiles.role`, sin filtro de organización). La organización de un usuario se resuelve vía `personas.profile_id -> personas.organizacion_id`, **no** desde `profiles`. |

**Decisión tomada (y por qué):** no se modificaron `is_admin()`/`is_library_staff()` ni las
políticas RLS existentes, porque ese patrón (rol global, sin organización) es el mismo que
usan otras tablas ya en producción (`personas`, etc.) — tocarlo tendría efecto dominó fuera
del alcance de Library. En su lugar, se creó un servicio de dominio
`OrganizationAccessGuard.assertOrganizationAccess()` que la capa de **aplicación** (Use Cases)
invoca en cada operación sensible: si el repositorio es `'privada'` y el recurso tiene
`organizacion_id` definido, exige que coincida con la organización del solicitante; si el
recurso es `'publica'` o tiene `organizacion_id` nulo (dato legado), no bloquea. Esta es hoy
la **única** capa real de aislamiento por organización — la RLS por sí sola no lo garantiza.

**Migraciones ajustadas:** las 3 migraciones de creación de tabla originales de LIB-01 se
descartaron (nunca se ejecutaron contra la base real, que ya tenía las tablas). Se reemplazaron
por `migrations/0002_library_hardening_prep.sql` (solo índices de apoyo, no destructivo) y
`migrations/0001_library_schema_audit_readme.md` (documentación del hallazgo). **No se requirió
ningún ALTER TABLE**: el esquema existente ya soporta todos los casos de uso de LIB-01.

**Pendiente explícito para LIB-03:** evaluar si conviene reforzar el aislamiento por
organización también a nivel de RLS (hay una función helper preparada, comentada, en
`0002_library_hardening_prep.sql`: `current_user_organizacion_id()` vía `personas.profile_id`),
en lugar de depender únicamente de la capa de aplicación.

---

## 2. Qué falta (para el siguiente agente)

### LIB-02 — Frontend
Construir la UI sobre las APIs ya existentes (arriba). Debe incluir: árbol de carpetas, tabla estándar FACILIA (Icono, Nombre, Descripción, Formato, Tamaño, Repositorio, Fecha, Usuario), toolbar, breadcrumb, upload con drag & drop, preview de PDF/imágenes vía Signed URL (`GET /api/library/download/:id`), búsqueda/filtros, y el componente `LibraryPicker` reutilizable por otros módulos. **No modificar backend ni dominio.**

### LIB-03 — Seguridad, ACL, Auditoría, Integración transversal
Sobre lo ya implementado, agregar: tabla `library_acl` y casos de uso de compartición (`ShareDocument`, `UnshareDocument`, `ListShares`, `UpdateShare`); servicio de auditoría independiente (`library_audit_log`); preparación de versionado (`DocumentVersionRepository`, `VersionService` vacíos/preparados); `DocumentLinkService` transversal reutilizable (`attachDocument`, `detachDocument`, `listDocuments`) construido sobre `LinkDocument`/`UnlinkDocument`/`DocumentLinkRepository` ya existentes; hardening y optimización. **No rediseñar ni modificar el dominio, las migraciones 0001-0003, ni las APIs ya listadas.**

---

## 3. Prompt de continuidad — LIB-02

> Actúa como Senior Frontend Engineer (Next.js 15, React 19, TypeScript Strict, TailwindCSS). El backend del módulo Library está completamente implementado (ver sección 1.2 de este documento: entidades, casos de uso y APIs REST en `modules/library/presentation/api/`). No modifiques el backend ni el dominio. Implementa únicamente la interfaz de usuario (componentes React, hooks, navegación por carpetas, tabla estándar FACILIA, drag & drop, upload con progreso, preview de PDF/imágenes vía Signed URL, búsqueda/filtros y el componente `LibraryPicker`), consumiendo exactamente los endpoints ya listados en la sección 1.2.

## 4. Prompt de continuidad — LIB-03

> Actúa como Senior Software Architect (DDD, Clean Architecture, Next.js 15, Supabase). El módulo Library ya tiene su dominio, backend y (tras LIB-02) su frontend implementados, **alineados al esquema real de FACILIA** (columnas en español, valores `'publica'`/`'privada'`, sin columna `status`; ver sección 1.3 de este documento). No rediseñes ni modifiques el dominio existente (`Document`, `Folder`, `DocumentReference`, Value Objects) ni las tablas ya existentes. **No modifiques `is_admin()` ni `is_library_staff()`** (son helpers globales usados por otras tablas de FACILIA). Extiende el módulo agregando ACL (`library_acl`), compartición (`ShareDocument`/`UnshareDocument`/`ListShares`/`UpdateShare`), auditoría como servicio independiente (`library_audit_log`), preparación de versionado, y el servicio transversal `DocumentLinkService` sobre los casos de uso `LinkDocument`/`UnlinkDocument` ya existentes. Evalúa además si conviene activar el helper `current_user_organizacion_id()` (preparado, comentado en `migrations/0002_library_hardening_prep.sql`) para reforzar en RLS el aislamiento por organización que hoy solo aplica `OrganizationAccessGuard` en la capa de aplicación. Al finalizar, genera `LIBRARY-README.md` y la sección "Preparado para Fase 2".
