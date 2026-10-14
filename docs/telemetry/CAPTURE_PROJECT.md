# Proyecto de Captura de Telemetría — Frontend (Backoffice)

## Contexto

Documento de continuidad para el proyecto de instrumentación de telemetría en el frontend de TrackFlow Backoffice. Este documento captura decisiones arquitectónicas, inventario de eventos, y guías para futuras modificaciones.

## Arquitectura

### Componentes del sistema

```
┌─────────────────────────────────────────────────────────────┐
│ Componentes React (pages/*, components/*)                   │
│   track("event_type", { properties })                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ lib/telemetry.ts — TelemetryService                         │
│                                                             │
│ 1. buildEvent() → Envelope automático                       │
│ 2. eventQueue[] → Cola local en memoria                     │
│ 3. flush() → Batch cada 10s o 20 eventos                    │
│ 4. sendBeaconBatch() → Flush en visibilitychange            │
│ 5. sendBatchWithRetry() → 3 intentos, backoff 1s/2s/4s     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Servicio backend (services/api)                             │
│ POST /telemetry/events → Stub de telemetría                 │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de datos

1. Componente llama a `track("event_type", { ... })`
2. `buildEvent()` genera: eventId, timestamp, sessionId, userId, schemaVersion, requestId
3. Evento se agrega a `eventQueue[]`
4. `flush()` se activa por:
   - Temporizador cada 10 segundos
   - Cola alcanza 20 eventos
   - `visibilitychange` (sendBeacon)
   - `beforeunload` (sendBeacon)
5. `sendBatchWithRetry()` envía POST con 3 reintentos
6. Si falla tras 3 intentos, el batch se descarta (telemetría no crítica)

### Decisiones técnicas

| Decisión | Opción | Razón |
|---|---|---|
| Sin dependencias externas | `crypto.randomUUID()` | Evita bundle extra (uuid). Fallback manual. |
| Sin PII en texto plano | SHA-256 vía Web Crypto API | Emails se hashean antes de enviar. |
| Sin bloqueo | Async + descarte | La telemetría nunca bloquea la UI. |
| Flush confiable | `sendBeacon` | Garantiza envío incluso al cerrar pestaña. |
| SSR guard | `typeof window === "undefined"` | Previene ejecución en server de Next.js. |
| Debate: forzar flush | `visibilitychange` + `beforeunload` | Cobertura máxima de captura. |
| Debounce batch | 10s / 20 eventos | Balance entre latencia y eficiencia. |

## Inventario de eventos instrumentados

### Eventos de autenticación

| Evento | Schema ref | Componente | Propiedades | PII |
|---|---|---|---|---|
| `login_attempted` | O4 | `login-form.tsx` | email (hash), success, ip_address, user_agent | ✅ Email hasheado |
| `login_failed` | O5 | `login-form.tsx` | email (hash), failure_reason, ip_address, attempt_count | ✅ Email hasheado |
| `session_started` | O7 | `login-form.tsx` | role, ip_address, user_agent | ❌ role sin PII |
| `session_expired` | O8 | `navbar-auth.tsx`, `profile-form.tsx` | session_duration_seconds, expired_reason | ❌ Sin PII |
| `user_registered` | O9 | `register-form.tsx` | role, registration_method | ❌ Sin PII |
| `password_reset_requested` | O6 | `forgot-password-form.tsx`, `reset-password-form.tsx` | email (hash en forgot, "reset_completed" en reset), source | ✅ Email hasheado / no-email |

### Eventos de navegación

| Evento | Schema ref | Componente | Propiedades | Notas |
|---|---|---|---|---|
| `page_navigated` | O16 | `PageTracker.tsx` | page, source_page (opcional), navigation_time_ms (opcional) | Se usa en 10 páginas |
| `frontend_error_captured` | O13 | `ErrorBoundary.tsx` | error_type, error_message, page, component_stack, line | Captura errores no manejados |

### Eventos de feature

| Evento | Schema ref | Componente | Propiedades |
|---|---|---|---|
| `feature_used` | O18 | `incident-form.tsx` | feature_name: "create_incident", page: "/incidents/new", action: "submit" |
| `feature_used` | O18 | `incident-list.tsx` | feature_name: "change_incident_status", page: "/incidents", action: "submit" |
| `feature_used` | O18 | `change-password-form.tsx` | feature_name: "change_password", page: "/account/change-password", action: "submit" |
| `feature_used` | O18 | `profile-form.tsx` | feature_name: "update_profile", page: "/account/profile", action: "submit" |

### Eventos de red

| Evento | Schema ref | Componente | Propiedades |
|---|---|---|---|
| `network_request_failed` | O15 | `incident-list.tsx` | endpoint, method, error_type, http_status, retry_attempted |

## Páginas instrumentadas con PageTracker

| Página | Ruta | Archivo |
|---|---|---|
| Home | `/` | `app/page.tsx` |
| Login | `/login` | `app/login/page.tsx` |
| Register | `/register` | `app/register/page.tsx` |
| Forgot password | `/forgot-password` | `app/forgot-password/page.tsx` |
| Incidents list | `/incidents` | `app/incidents/page.tsx` |
| New incident | `/incidents/new` | `app/incidents/new/page.tsx` |
| Incidents summary | `/incidents/summary` | `app/incidents/summary/page.tsx` |
| Suppliers | `/suppliers` | `app/suppliers/page.tsx` |
| Profile | `/account/profile` | `app/account/profile/page.tsx` |
| Change password | `/account/change-password` | `app/account/change-password/page.tsx` |

## Cobertura vs plan de telemetría

### Eventos planificados (23) vs instrumentados (10)

| # | Evento | Estado | Notas |
|---|---|---|---|
| M1 | `inbound_order_created` | ❌ No instrumentado | Backend |
| M2 | `outbound_order_created` | ❌ No instrumentado | Backend |
| M3 | `stock_threshold_triggered` | ❌ No instrumentado | Backend |
| M4 | `direct_stock_edit_rejected` | ❌ No instrumentado | Backend |
| M5 | `inventory_discrepancy_detected` | ❌ No instrumentado | Backend |
| O1 | `product_catalog_viewed` | ❌ No instrumentado | Backend |
| O2 | `inbound_order_failed` | ❌ No instrumentado | Backend |
| O3 | `outbound_order_failed` | ❌ No instrumentado | Backend |
| **O4** | **`login_attempted`** | ✅ Instrumentado | Frontend |
| **O5** | **`login_failed`** | ✅ Instrumentado | Frontend |
| **O6** | **`password_reset_requested`** | ✅ Instrumentado | Frontend |
| **O7** | **`session_started`** | ✅ Instrumentado | Frontend |
| **O8** | **`session_expired`** | ✅ Instrumentado | Frontend |
| **O9** | **`user_registered`** | ✅ Instrumentado | Frontend |
| O10 | `api_latency_recorded` | ❌ No instrumentado | Backend |
| O11 | `page_load_time_recorded` | ❌ No instrumentado | Pendiente si se requiere |
| O12 | `api_error_rate_recorded` | ❌ No instrumentado | Backend |
| **O13** | **`frontend_error_captured`** | ✅ Instrumentado | Frontend |
| O14 | `api_validation_error` | ❌ No instrumentado | Backend |
| **O15** | **`network_request_failed`** | ✅ Instrumentado | Frontend |
| **O16** | **`page_navigated`** | ✅ Instrumentado | Frontend |
| O17 | `flow_abandoned` | ❌ No instrumentado | Pendiente UX |
| **O18** | **`feature_used`** | ✅ Instrumentado | Frontend |

## Guía para futuras modificaciones

### Cómo agregar un nuevo evento

1. Definir schema en `docs/telemetry/event-schemas.json` (event_type + required properties)
2. En el componente, importar `track` desde `@/lib/telemetry`
3. Llamar `track("event_type", { prop1: value1, prop2: value2 })` con propiedades del schema
4. Si el evento contiene PII (email), hashear con `await sha256(email)` antes de trackear
5. Verificar con `get_errors()` que no haya errores de compilación

### Cómo agregar PageTracker a una nueva página

```tsx
import PageTracker from "@/components/PageTracker";

// Dentro del return:
<PageTracker page="/mi-ruta" />
```

### Reglas PII

- **Siempre hashear** emails con SHA-256 antes de pasar a `track()`
- **Nunca** incluir contraseñas, tokens completos, o datos financieros
- `ip_address` usar placeholder `"frontend_capture"` — la IP real se añade server-side
- `session_duration_seconds` es seguro (no es PII)

### Archivos clave

| Archivo | Propósito |
|---|---|
| `lib/telemetry.ts` | Servicio central de telemetría (único punto de entrada) |
| `components/PageTracker.tsx` | Componente cliente para `page_navigated` |
| `components/ErrorBoundary.tsx` | Error boundary para `frontend_error_captured` |
| `.env.local` | `NEXT_PUBLIC_TELEMETRY_ENDPOINT` |
| `docs/telemetry/event-schemas.json` | Schema de validación (JSON Schema draft-07) |
| `docs/telemetry/telemetry-plan.md` | Plan original con hipótesis de negocio |
| `docs/telemetry/TELEMETRY_PROJECT.md` | Documentación del proyecto de telemetría |

## Estado de la rama

- **Branch**: `feature/telemetry-capture`
- **Base**: `main`
- **PR**: Pendiente de creación