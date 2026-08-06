# LIB-00 — Arquitectura Funcional del Módulo Library (FACILIA)

## 1. Objetivos

- Proveer una biblioteca documental transversal, reutilizable por cualquier módulo de FACILIA (Comercial, Personas, Organizaciones, Activos, Proyectos, etc.) sin acoplamiento.
- Soportar dos repositorios únicos: **Pública** (visible entre organizaciones autorizadas) y **Privada** (aislada por organización propietaria).
- Permitir organización jerárquica ilimitada mediante carpetas.
- Evitar duplicación de archivos: un documento físico puede asociarse a N entidades del sistema mediante referencias (links), nunca copias.
- Dejar preparada (sin implementar) la extensión hacia ACL, compartición, versionado y auditoría.
- Cumplir Charlie Compliant: DDD + Clean Architecture + Repository Pattern + Casos de Uso + RLS.

## 2. Casos de uso (enumeración funcional)

**Carpetas:** CreateFolder, RenameFolder, MoveFolder, DeleteFolder, ListFolders, GetFolderTree.

**Documentos:** UploadDocument, GetDocument, ListDocuments, SearchDocuments, RenameDocument, MoveDocument, DeleteDocument, DownloadDocument, GetPreviewUrl.

**Vínculos (integración):** LinkDocument, UnlinkDocument, ListDocumentsByEntity, ListEntitiesByDocument.

**Preparados para etapas futuras (no implementar aún):** ShareDocument, RevokeShare, ListShares, CreateDocumentVersion, ListVersions, RecordAuditEvent, GetAuditTrail.

## 3. Arquitectura general

Módulo autocontenido `modules/library`, siguiendo Clean Architecture en 4 capas:

```
modules/library/
  domain/          -> Entidades, Value Objects, interfaces de Repository, errores de dominio. Sin dependencias externas.
  application/     -> Casos de uso (orquestación), DTOs de entrada/salida. Depende solo de domain.
  infrastructure/   -> Implementaciones Supabase de los repositorios, mapeo DB<->dominio, storage, constantes.
  presentation/    -> API Routes (Next.js Route Handlers) y, en LIB-02, componentes React/hooks.
```

Reglas de dependencia (Clean Architecture): `presentation -> application -> domain`, e `infrastructure -> domain` (implementa interfaces). Ningún endpoint accede directamente a Supabase; siempre pasa por un Use Case.

El módulo no pertenece a Comercial, Personas u Organizaciones: es un **servicio transversal** consumido por ellos vía `DocumentLinkService` (interfaz estable, ver §9).

## 4. Modelo DDD

### 4.1 Entidades

- **Document**: raíz de agregado. Representa un archivo físico único en Storage. Contiene metadatos (nombre, descripción, formato, tamaño, mime, visibilidad, organización propietaria, repositorio, carpeta, auditoría de creación/modificación, estado).
- **Folder**: nodo de un árbol jerárquico (self-referencing `parent_folder_id`), pertenece a una organización y a un repositorio.
- **DocumentReference**: entidad que vincula un `Document` con una entidad externa de FACILIA (`entityType` + `entityId`) sin conocer su implementación concreta.
- **Repository** (concepto, no tabla obligatoria): agregador lógico de tipo `PUBLIC` / `PRIVATE`, representado como Value Object `RepositoryType` más que como entidad persistida — no hay atributos propios más allá del tipo.
- **ACL** *(preparado, no implementado)*: entidad futura para permisos granulares.
- **Tag** *(fuera de alcance en esta fase, mencionado como extensión futura)*.

### 4.2 Value Objects

- `DocumentId`, `FolderId` (UUID tipados).
- `RepositoryType` (`PUBLIC` | `PRIVATE`).
- `Visibility` (`PUBLIC` | `PRIVATE`) — visibilidad del documento, independiente pero coherente con el repositorio.
- `FileMetadata` (extension, mimeType, sizeInBytes) — inmutable, validado en construcción.
- `StorageLocation` (bucket, path) — encapsula la ubicación física, nunca expuesta directamente a capas superiores salvo para generar URLs firmadas.
- `DocumentStatus` (`ACTIVE` | `DELETED`) — soporta soft delete.
- `EntityReference` (entityType, entityId) — usado por `DocumentReference`.

### 4.3 Interfaces de Repository (contratos de dominio)

- `DocumentRepository`: `save`, `findById`, `findMany(filters)`, `search(query, filters)`, `delete` (soft), `move`.
- `FolderRepository`: `save`, `findById`, `findChildren(parentId)`, `findTree(repositoryType, organizationId)`, `rename`, `delete`.
- `StorageRepository`: `upload`, `delete`, `move`, `getSignedDownloadUrl`, `getSignedPreviewUrl`.
- `DocumentLinkRepository` *(soporta integración transversal)*: `link`, `unlink`, `findByEntity`, `findByDocument`.

### 4.4 Servicios de dominio

- **DocumentNamingService**: resuelve colisiones de nombre dentro de una misma carpeta (no implementado en LIB-01, arquitectura reservada).
- No se identifican otros servicios de dominio imprescindibles en esta fase; la lógica de orquestación vive en los Use Cases (capa de aplicación), manteniendo el dominio delgado.

## 5. Modelo ER conceptual (sin SQL)

- **library_folders**(id, organization_id, repository_type, parent_folder_id, name, description, sort_order, created_at, updated_at, deleted_at)
- **library_documents**(id, organization_id, repository_type, folder_id, storage_bucket, storage_path, file_name, original_name, extension, mime_type, file_size, title, description, visibility, status, created_by, updated_by, created_at, updated_at, deleted_at)
- **library_document_links** (tabla polimórfica)(id, document_id, entity_type, entity_id, created_by, created_at)
- *(preparado, no implementado)* **library_acl**(id, document_id | folder_id, subject_type, subject_id, permission)
- *(preparado, no implementado)* **library_document_versions**(id, document_id, version_number, storage_path, created_by, created_at)
- *(preparado, no implementado)* **library_audit_log**(id, document_id, user_id, organization_id, action, ip, user_agent, created_at)

Relaciones clave: `library_folders.parent_folder_id -> library_folders.id` (árbol); `library_documents.folder_id -> library_folders.id`; `library_document_links.document_id -> library_documents.id` (1 documento : N vínculos, sin duplicar el archivo).

## 6. Navegación / UI (a implementar en LIB-02)

```
Biblioteca
 ├── Pública
 │    └── Carpetas -> Subcarpetas -> Documentos
 └── Privada
      └── Carpetas -> Subcarpetas -> Documentos
```

Componentes previstos: tabla estándar FACILIA (Icono, Nombre, Descripción, Formato, Tamaño, Público, Organización, Fecha, Usuario), árbol de carpetas, toolbar, breadcrumb, panel/drawer de preview, `LibraryPicker` para selección desde otros módulos.

## 7. APIs (contrato REST, implementación en LIB-01)

```
GET    /api/library/documents
POST   /api/library/documents           (metadata; el binario va por /upload)
PATCH  /api/library/documents/:id
DELETE /api/library/documents/:id
GET    /api/library/folders
POST   /api/library/folders
PATCH  /api/library/folders/:id
DELETE /api/library/folders/:id
POST   /api/library/upload
GET    /api/library/download/:id
POST   /api/library/link
DELETE /api/library/link
```

## 8. Storage (Supabase)

Dos buckets, definidos como constantes (nunca hardcodeados): `public-library`, `private-library`. Estrategia de path: `{organization_id}/{repository_type}/{folder_id | 'root'}/{document_id}.{extension}` — el nombre físico usa el `document_id` para evitar colisiones; `original_name` se conserva como metadato para mostrar al usuario. Descarga y preview usan **Signed URLs** de corta duración generadas por `StorageRepository`, nunca URLs públicas directas para el bucket privado.

## 9. Integración con FACILIA

Cualquier módulo consume Library exclusivamente a través de una interfaz estable `DocumentLinkService` (con métodos `attachDocument`, `detachDocument`, `listDocuments`) y del componente `LibraryPicker` (UI, LIB-02), sin conocer entidades, tablas ni repositorios internos de Library. Esto garantiza que Library pueda evolucionar (ACL, versionado, auditoría) sin romper a sus consumidores.

## 10. Seguridad y permisos (arquitectura preparada, no implementada aún)

- Visibilidad binaria (`PUBLIC`/`PRIVATE`) ya activa en el dominio.
- Modelo ACL desacoplado (`library_acl`) diseñado para crecer hacia lectura/escritura/eliminación/compartir/propietario, sin tocar el dominio de `Document`/`Folder`.
- RLS en PostgreSQL como mecanismo de aislamiento por organización desde el día uno (implementado en LIB-01 a nivel de política básica de organización; ACL granular queda para LIB-03).

## 11. Auditoría y versionado (arquitectura preparada, no implementada aún)

- Auditoría como servicio independiente (`library_audit_log`), desacoplado del dominio, para no contaminar `Document` con responsabilidades de logging.
- Versionado: el modelo de datos reserva la posibilidad de una tabla `library_document_versions` referenciando el mismo `document_id`; el dominio actual no expone `version` como campo mutable en el archivo raíz.

## 12. Exclusiones de esta fase

OCR, firma digital, workflows de aprobación, gestión de contratos/renovaciones/alertas, IA, versionado, watermarks. No se diseñan en LIB-00 ni se implementan en etapas futuras cercanas.

## 13. Roadmap técnico

1. **LIB-01** — Dominio, base de datos, Storage, backend, APIs (sin frontend, sin ACL, sin auditoría).
2. **LIB-02** — Frontend completo (tabla, árbol de carpetas, upload, drag & drop, preview, `LibraryPicker`).
3. **LIB-03** — ACL, compartición, auditoría, preparación de versionado, integración transversal formal, hardening y optimización. MVP finalizado.
4. **Fase 2 (futura)** — Versionado real, contratos, firma digital, OCR, búsqueda semántica/IA, workflows de aprobación.

---

## Contexto para LIB-01

**Resumen para el siguiente agente:** el módulo Library ya está diseñado como se describe arriba. Existen dos repositorios (`PUBLIC`/`PRIVATE`), documentos y carpetas jerárquicas, y vínculos polimórficos (`library_document_links`) para asociar un documento a cualquier entidad de FACILIA sin duplicarlo. El dominio define las entidades `Document`, `Folder`, `DocumentReference`, y Value Objects (`DocumentId`, `FolderId`, `RepositoryType`, `Visibility`, `FileMetadata`, `StorageLocation`, `DocumentStatus`, `EntityReference`). Los repositorios de dominio a implementar son `DocumentRepository`, `FolderRepository`, `StorageRepository`, `DocumentLinkRepository`. Los buckets de Storage son `public-library` y `private-library`, definidos como constantes, con paths `{organization_id}/{repository_type}/{folder_id|root}/{document_id}.{extension}`. No implementar todavía ACL, versionado ni auditoría — solo dejar el modelo de datos preparado a nivel conceptual (ya cubierto en §5, §10, §11).

**Prompt de continuidad:** *"Actúa como Senior Software Engineer y ejecuta LIB-01 sobre la arquitectura ya definida en LIB-00 (ver arriba). No rediseñes nada; implementa el dominio, las migraciones SQL, el Storage, los repositorios Supabase, los casos de uso de aplicación y los API Routes REST, respetando exactamente el modelo ER, las entidades y los Value Objects descritos."*
