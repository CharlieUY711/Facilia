# COM-02 — Backend Core + Integración Twilio WhatsApp API

**Módulo:** COM — Communications Hub
**Etapa anterior:** COM-01 (Modelo de Dominio y Persistencia)
**Estado:** Implementado y probado (17/17 tests OK, `tsc --noEmit` limpio sobre todo el repo)

---

## 1. Qué se construyó

Arquitectura Clean (Domain → Application → Infrastructure → API), tal como pide el prompt de COM-02, viviendo en `modules/com/` con el mismo criterio de acceso y de composición que ya usa `lib/library/*` + `app/api/library/*`:

```text
modules/com/
├── domain/
│   ├── entities.ts                     Conversation, Message, DeliveryRecord, etc. (espejo del esquema §9)
│   ├── errors.ts                       ComDomainError y subclases (NotFound, Closed, ProviderSendError, InvalidWebhookSignatureError...)
│   └── ports/
│       ├── CommunicationProvider.ts    sendMessage / getDeliveryStatus / processWebhook
│       ├── repositories.ts             ConversationRepository, MessageRepository, DeliveryRepository, PersonaDirectoryPort, CommunicationPreferenceRepository
│       └── EvidenceStorageProvider.ts  saveEvidenceReference (preparado para COM-04, sin implementación real)
│
├── application/
│   ├── dto.ts
│   ├── useCases/
│   │   ├── createConversation.ts
│   │   ├── sendCommunication.ts
│   │   ├── receiveMessage.ts
│   │   └── registerDeliveryStatus.ts
│   └── __tests__/
│       ├── fakes.ts                    fakes en memoria de todos los puertos
│       ├── sendCommunication.test.ts
│       └── receiveMessage.test.ts
│
├── infrastructure/
│   ├── twilio/
│   │   ├── TwilioWhatsAppProvider.ts   única implementación de CommunicationProvider
│   │   ├── twilioSignature.ts          HMAC-SHA1 puro (node:crypto), sin SDK de Twilio
│   │   └── __tests__/twilioSignature.test.ts
│   └── supabase/
│       ├── SupabaseConversationRepository.ts
│       ├── SupabaseMessageRepository.ts        (idempotencia por external_message_id)
│       ├── SupabaseDeliveryRepository.ts
│       ├── SupabasePersonaDirectoryRepository.ts  (solo lectura de `personas`)
│       ├── SupabaseCommunicationPreferenceRepository.ts
│       └── NoopEvidenceStorageProvider.ts
│
├── container.ts                        composition root — API routes SOLO importan de acá
└── auth.ts                             getComAuth() — mismo patrón que lib/library/auth.ts

app/api/com/
├── conversations/route.ts                          GET (lista) / POST (crear)
├── conversations/[id]/route.ts                     GET (una)
├── conversations/[id]/messages/route.ts            GET (historial)
├── messages/send/route.ts                          POST (SendCommunication)
└── webhooks/twilio/route.ts                         POST (sin sesión, firma HMAC)
```

No se tocó nada de `Operations`, `Directory` ni `Library` (los repositorios de COM leen `personas` y, en COM-04, van a leer `library_documents` — nunca escriben ahí).

---

## 2. Principio de arquitectura aplicado

```
COM Domain  →  CommunicationProvider (interfaz)  →  TwilioWhatsAppProvider  →  Twilio REST API
```

El dominio y `application/useCases/*` **no importan nada de Twilio ni de Supabase**. Se verificó en el código: los únicos archivos que mencionan Twilio están en `infrastructure/twilio/`; los únicos que importan `@/lib/supabase/server` están en `infrastructure/supabase/`. `container.ts` es el único punto donde domain, application e infrastructure se juntan.

No se instaló el SDK `twilio` — el envío es un `POST` REST con Basic Auth (`fetch` nativo) y la firma del webhook (`X-Twilio-Signature`) se valida con HMAC-SHA1 implementado a mano sobre `node:crypto`, siguiendo el algoritmo documentado por Twilio (URL exacta + parámetros ordenados alfabéticamente + concatenados, HMAC con el Auth Token, base64, comparación en tiempo constante).

---

## 3. Casos de uso

### `CreateConversationUseCase`
Valida que la persona exista (lectura a `personas`, Directory) y crea la fila en `com_conversations`. `work_order_id` es opcional — se puede crear una conversación sin ninguna orden asociada, que es justamente lo que permite probar COM-02 a COM-05 sin que exista el módulo Operations todavía.

### `SendCommunicationUseCase`
1. Valida que la conversación exista y esté `abierta` (si no, `ConversationNotFoundError` / `ConversationClosedError`).
2. Resuelve el teléfono efectivo: `com_communication_preferences.telefono_whatsapp` si existe, si no `personas.telefono`. Si `whatsapp_habilitado = false`, lanza `CommunicationDisabledError` sin intentar nada. Si no hay teléfono, `RecipientPhoneMissingError`.
3. Crea el `Message` en estado `creado` **antes** de llamar al proveedor — así queda constancia incluso si Twilio nunca responde (timeout).
4. Llama a `provider.sendMessage()`. Éxito → `Message.estado_entrega = 'enviado'` + `DeliveryRecord.estado = 'sent'`. Falla el proveedor → `Message.estado_entrega = 'fallido'` + `DeliveryRecord.estado = 'failed'` con `error_code`. **Nunca propaga la excepción del proveedor hacia la API route** — un error de Twilio es un resultado de negocio válido (`FAILED`), no un 500.

### `ReceiveMessageUseCase`
Recibe el webhook ya normalizado por `provider.processWebhook()` (firma ya validada ahí) y distingue dos casos por el shape del evento:

- **`inbound_message`** (el empleado respondió): busca por `(proveedor, external_message_id)` — si ya existe, devuelve `duplicate` sin tocar nada más. Si no, resuelve la persona por teléfono (`PersonaDirectoryPort.findByTelefono`); si el teléfono es desconocido, se ignora explícitamente (`UNKNOWN_SENDER_PHONE`) en vez de crear una conversación huérfana. Busca una conversación abierta de esa persona o crea una nueva, crea el `Message` entrante, y por cada URL de media dispara `EvidenceStorageProvider.saveEvidenceReference()` (que en COM-02 es un **noop** — ver §5).
- **`delivery_status`** (status callback de un mensaje que enviamos nosotros): delega en `RegisterDeliveryStatusUseCase`.

### `RegisterDeliveryStatusUseCase`
Busca el `Message` por `(proveedor, external_message_id)`. Si no existe, `MESSAGE_NOT_FOUND` (se ignora). Si el último `DeliveryRecord` de ese mensaje ya tenía exactamente ese mismo estado, no inserta una fila idéntica ni vuelve a tocar el `Message` (protección extra de idempotencia para reintentos de Twilio, más allá del índice único que ya cubre los mensajes).

---

## 4. Idempotencia (COM-02 §11)

Dos mecanismos, no uno solo:

1. **Chequeo aplicativo**: `ReceiveMessageUseCase` busca por `external_message_id` antes de crear cualquier `Message`.
2. **Constraint de base**: el índice único `com_messages_external_unique (proveedor, external_message_id) where external_message_id is not null` (ya aplicado en el schema de COM-01 §9) es la garantía real contra condiciones de carrera — dos webhooks del mismo mensaje llegando casi en simultáneo. `SupabaseMessageRepository.create()` atrapa el código de error `23505` (unique_violation) de Postgres y, en ese caso, devuelve la fila que ganó la carrera en vez de romper.

Para los status callbacks (que no tienen un índice único propio porque un mensaje sí puede pasar dos veces por el mismo estado en teoría) se agregó una protección a nivel aplicativo: no se inserta un `DeliveryRecord` si es idéntico al último registrado para ese mensaje.

---

## 5. Multimedia / evidencia — qué SÍ y qué NO se hizo en esta etapa

Tal como pide el prompt ("NO guardar archivo"), `ReceiveMessageUseCase` detecta `MediaUrl0..N` en el webhook, marca el `Message.tipo = 'imagen'`, y llama a `EvidenceStorageProvider.saveEvidenceReference()` **sin descargar nada**. La única implementación de este puerto en COM-02 es `NoopEvidenceStorageProvider`, que registra un `console.warn` y devuelve `{ stored: false }`.

No se insertó nada en `com_evidence_references` porque esa tabla exige `library_document_id not null` — no puede haber una referencia de evidencia sin un documento real de Library, y crear ese documento (descargar el media de Twilio, subirlo, etc.) es exactamente el alcance de **COM-04**.

---

## 6. Seguridad

- El webhook de Twilio (`POST /api/com/webhooks/twilio`) no tiene sesión de usuario — su autorización es la firma `X-Twilio-Signature`, validada con `TWILIO_AUTH_TOKEN` (variable de entorno, nunca hardcodeado). Firma inválida → `401`, sin procesar nada del body.
- El resto de las rutas (`/conversations`, `/messages/send`) usan `getComAuth()` (`modules/com/auth.ts`), que exige sesión y rol `admin`/`colaborador`/`super_admin` — mismo criterio que `is_admin_or_colaborador()` en RLS y que `lib/library/auth.ts`.
- Los repositorios usan `createServiceClient()` (Service Role Key) porque las mutaciones ya están gobernadas por la autorización de la API route — mismo patrón que `lib/library/repository.ts`. RLS sigue activo como segunda capa de defensa (ya aplicado en el schema de COM-01 §9).
- Ningún secreto (Account SID, Auth Token) vive en código: se leen de `process.env` en `container.ts` (`readEnv()` lanza si falta alguna).

**Variables de entorno nuevas que hay que agregar a `.env.local`** (no se tocó el archivo real, solo se documenta acá):

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=+14155238886          # número habilitado en Twilio, sin "whatsapp:"
COM_TWILIO_WEBHOOK_PUBLIC_URL=             # opcional — esquema+host público real, si el proxy no lo refleja en la request
```

---

## 7. Pruebas

`npx tsx --test modules/com/**/*.test.ts` (o `npm run test:com` — se agregó `tsx` como devDependency porque el repo no tiene Jest configurado):

- **SendCommunication** (5 tests): envío exitoso, error de proveedor → `FAILED` sin lanzar excepción, conversación inexistente, conversación cerrada, persona sin teléfono.
- **ReceiveMessage** (6 tests): mensaje entrante nuevo, idempotencia por `external_message_id`, teléfono desconocido ignorado, evidencia multimedia dispara el puerto por cada URL, status callback aplica el cambio de estado, status callback repetido no duplica el `DeliveryRecord`.
- **Firma Twilio** (6 tests): firma válida, Auth Token equivocado, URL alterada, header faltante, payload manipulado después de firmar, parsing de `application/x-www-form-urlencoded`.

Resultado: **17/17 OK**. `npx tsc --noEmit` sobre todo el repo, sin errores.

---

## 8. Archivos creados

```
modules/com/domain/entities.ts
modules/com/domain/errors.ts
modules/com/domain/ports/CommunicationProvider.ts
modules/com/domain/ports/repositories.ts
modules/com/domain/ports/EvidenceStorageProvider.ts
modules/com/application/dto.ts
modules/com/application/useCases/createConversation.ts
modules/com/application/useCases/sendCommunication.ts
modules/com/application/useCases/receiveMessage.ts
modules/com/application/useCases/registerDeliveryStatus.ts
modules/com/application/__tests__/fakes.ts
modules/com/application/__tests__/sendCommunication.test.ts
modules/com/application/__tests__/receiveMessage.test.ts
modules/com/infrastructure/twilio/TwilioWhatsAppProvider.ts
modules/com/infrastructure/twilio/twilioSignature.ts
modules/com/infrastructure/twilio/__tests__/twilioSignature.test.ts
modules/com/infrastructure/supabase/SupabaseConversationRepository.ts
modules/com/infrastructure/supabase/SupabaseMessageRepository.ts
modules/com/infrastructure/supabase/SupabaseDeliveryRepository.ts
modules/com/infrastructure/supabase/SupabasePersonaDirectoryRepository.ts
modules/com/infrastructure/supabase/SupabaseCommunicationPreferenceRepository.ts
modules/com/infrastructure/supabase/NoopEvidenceStorageProvider.ts
modules/com/container.ts
modules/com/auth.ts
app/api/com/conversations/route.ts
app/api/com/conversations/[id]/route.ts
app/api/com/conversations/[id]/messages/route.ts
app/api/com/messages/send/route.ts
app/api/com/webhooks/twilio/route.ts
```

**Archivos modificados:**

```
package.json   → agregado devDependency "tsx" y script "test:com"
```

**No modificado:** el esquema SQL de COM-01 §9 ya estaba aplicado (confirmado por el usuario) y no requirió ningún ajuste.

---

## 9. Criterios de aceptación — checklist

- ✅ enviar WhatsApp desde FACILIA — `SendCommunicationUseCase` + `TwilioWhatsAppProvider.sendMessage()`
- ✅ recibir respuestas — `ReceiveMessageUseCase` (inbound_message)
- ✅ guardar conversaciones — `com_conversations` vía `SupabaseConversationRepository`
- ✅ registrar estados Twilio — `com_delivery_records` vía `RegisterDeliveryStatusUseCase`
- ✅ manejar multimedia básica — detección de `MediaUrl0..N`, sin descarga (diferido a COM-04)
- ✅ mantener independencia del proveedor — `CommunicationProvider` es el único punto de contacto; `application/*` no importa Twilio

---

# Contexto para COM-03

**Resumen para el siguiente agente:** COM-02 dejó el backend de transporte funcionando end-to-end (`SendCommunication`, `ReceiveMessage`, `RegisterDeliveryStatus`, webhook con firma validada, idempotencia por `external_message_id`) sobre el esquema ya aplicado de COM-01 §9. Las tablas `com_templates`, `com_rules` y `com_scheduled_communications` **ya existen en la base** (aplicadas en COM-01/COM-02) pero **no tienen ningún caso de uso ni motor todavía** — COM-02 no las tocó desde código, solo las dejó listas.

Lo que COM-03 tiene que construir:

1. **Motor de plantillas**: un `TemplateRenderer` que tome `CommunicationTemplate.contenido` (con placeholders `{{variable}}`) + un diccionario de variables resueltas (empleado, cliente, hora, dirección, etc.) y devuelva el texto final que `SendCommunicationUseCase.execute()` va a recibir como `contenido`. Ojo: `SendCommunicationInput.contenido` ya es un `string` plano — el renderer vive *antes* de llamar al caso de uso existente, no hay que tocarlo.

2. **Reglas automáticas** (`com_rules`): dado un evento (`evento: string`, hoy solo texto libre) y sus `condiciones` (jsonb), resolver qué `template_id` disparar y armar el `SendCommunicationInput` correspondiente. La forma más simple de enganchar esto sin crear una nueva capa: un caso de uso `TriggerRule(evento, payload)` en `modules/com/application/useCases/`, reutilizando el `container.ts` ya existente.

3. **Eventos desde Operations**: seguir sin depender de que el módulo exista. La interfaz de entrada (`WorkOrderAssigned`, etc.) puede modelarse como un tipo de payload que hoy solo se dispara manualmente vía una API interna de pruebas (`POST /api/com/events/trigger` o similar) — igual que en COM-02, donde `POST /api/com/conversations` permite crear conversaciones sin Operations. Cuando Operations exista, ese mismo listener pasa a alimentarse de eventos reales sin cambiar el caso de uso.

4. **Programación de recordatorios** (`com_scheduled_communications`): ya existe la tabla y el índice parcial `com_scheduled_pendientes_idx` sobre `ejecutar_en where estado = 'pendiente'`. Falta el *motor* — un job (cron / Vercel Cron / lo que use el resto del repo, revisar si ya hay algo similar en `api/cotizador/*`) que lea pendientes vencidos y llame a `SendCommunicationUseCase` reutilizando `container.ts`. La columna `regla_id` en `com_messages` y el `enviado_por: null` (mensaje automático, no manual) ya están soportados por el esquema y por `CreateMessageData` — no hace falta tocar el dominio de COM-02 para esto.

5. **Puntos de extensión que COM-02 dejó abiertos a propósito**: `ReceiveMessageUseCase` NO interpreta todavía el contenido de un mensaje entrante (ej. "CONFIRMAR" → `TaskAccepted`, "NO PUEDO" → `TaskRejected`) — eso es reglas de negocio de automatización, corresponde a COM-03/COM-05, no al transporte. El lugar natural para enganchar esa clasificación es después de que `ReceiveMessageUseCase.execute()` devuelve `{ kind: "inbound_message", message, conversation }` — un `MessageClassifier` o una regla con `evento = "MessageReceived"` puede consumir ese resultado sin que `ReceiveMessageUseCase` necesite saber nada de reglas.
