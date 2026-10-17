# STORAGE_PROJECT.md — Proyecto: Telemetría de tu compañía — Almacenamiento

> **Proyecto:** Telemetría de tu compañía — Almacenamiento  
> **Módulo:** Application Telemetry (Fase 3 de 4)  
> **Rama:** `feature/telemetry-storage`  
> **Empresa:** TrackFlow  
> **Estado:** ✅ Completado  

---

## 📋 Resumen del proyecto

Reemplazar el **stub endpoint** de telemetría (Fase 2) con una **implementación real** que valida y persiste eventos de telemetría en PostgreSQL.

### Lo que se construyó

| Componente | Antes (Fase 2 - Stub) | Ahora (Fase 3 - Almacenamiento) |
|-----------|----------------------|--------------------------------|
| `POST /telemetry/events` | Loggeaba y descartaba eventos | ✅ Valida + persiste en PostgreSQL |
| Validación | Batch-level (422 si 1 falla) | ✅ Per-event: inválidos → `rejected` |
| Persistencia | ❌ No persistía nada | ✅ Bulk insert en `telemetry_events` |
| Response | `{ "received": N }` | ✅ `{ "received": N, "stored": M, "rejected": R }` |
| Base de datos | TinyDB (no relacional) | ✅ PostgreSQL (asyncpg) |
| Docker | ❌ No contenerizado | ✅ Dockerizado con docker-compose |

### Sin cambios en frontend

El frontend sigue usando la misma URL (`NEXT_PUBLIC_TELEMETRY_ENDPOINT`), el mismo `TelemetryService` (`lib/telemetry.ts`), y recibe el mismo formato de respuesta (ampliado con `stored` y `rejected`).

---

## 🏗️ Arquitectura

```
┌──────────────────────────┐     POST /telemetry/events     ┌──────────────────────────┐
│   Frontend (Backoffice)   │ ──────────────────────────────→ │   API Backend (FastAPI)   │
│   lib/telemetry.ts        │                                 │   routes/telemetry.py     │
│   TelemetryService         │ ←───────────────────────────── │   (Fase 3 - Real)        │
│   Batch + Debounce         │     { received, stored,        │                          │
│   10s / 20 eventos        │       rejected }               │                          │
└──────────────────────────┘                                 └───────────┬──────────────┘
                                                                        │
                                                                        ▼
                                                               ┌──────────────────────────┐
                                                               │   PostgreSQL              │
                                                               │   telemetry_events        │
                                                               │   (Write-only / Append)  │
                                                               └──────────────────────────┘
```

### Flujo de datos

1. Frontend acumula eventos en cola local (batch cada 10s o 20 eventos)
2. Envía `POST /telemetry/events` con `{ "events": [...] }`
3. Backend parsea el envelope suelto (`list[dict]` — **NO** `list[TelemetryEvent]`)
4. Cada evento se valida con `TelemetryEvent.model_validate()` en try/except
5. Eventos inválidos → incrementan `rejected` (no abortan el batch)
6. Eventos válidos → bulk INSERT en una sola transacción
7. Response: `{ "received": N, "stored": M, "rejected": R }`

---

## 📦 Entregables

### Fase 1 — Tabla `telemetry_events` en PostgreSQL

**Schema:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK, default `gen_random_uuid()` | Identificador único |
| `timestamp` | `timestamptz` NOT NULL | Timestamp ISO 8601 del evento |
| `service` | `text` NOT NULL | Origen (`backoffice`, `api`) |
| `event_type` | `text` NOT NULL | Taxonomía `entidad_acción` |
| `level` | `text` default `'info'` | Severidad: `info`, `warn`, `error` |
| `value` | `numeric` nullable | Valor numérico si aplica |
| `message` | `text` nullable | Descripción legible |
| `tags` | `jsonb` default `'{}'` | Envelope + propiedades contextuales |

**Índices:**
1. `timestamp` (BTREE) — búsquedas por rango de fechas
2. `event_type` (BTREE) — filtrado por tipo de evento
3. `tags` (GIN) — búsquedas JSONB

**Write-only:** La tabla es append-only. Nunca se actualizan o borran eventos.

### Fase 2 — Endpoint POST /telemetry/events (real)

| Aspecto | Implementación |
|---------|---------------|
| Parseo | `body: list[dict]` — parseo suelto |
| Validación | `TelemetryEvent.model_validate(raw)` por evento |
| Manejo errores | try/except por evento, inválidos → `rejected` |
| Bulk insert | `executemany` con INSERT parametrizado |
| Service derivación | Basado en `event_type` (`api_*` → `api`, `page_*`/`session_*` → `backoffice`) |
| Level derivación | Basado en sufijo (`_error` → error, `_rejected`/`_triggered` → warn, else → info) |
| Tags | Envelope fields (`eventId`, `sessionId`, `userId`, `schemaVersion`, `requestId`) + properties contextuales |
| Response | `{ "received": N, "stored": M, "rejected": R }` |

### Fase 3 — Dockerización

| Servicio | Puerto Host | Puerto Interno | Tecnología |
|----------|------------|----------------|------------|
| `postgres` | 5432 | 5432 | PostgreSQL 16 Alpine |
| `api-backend` | 8001 | 8000 | FastAPI (Python 3.12-slim) + asyncpg |
| `backoffice` | 3002 | 3002 | Next.js 16 (node:22-alpine) |

### Fase 4 — Verificación

- ✅ Eventos reales generados desde backoffice (inbound + outbound + error)
- ✅ Consulta directa a `telemetry_events` confirma datos correctos
- ✅ Batch mixto válido/inválido con curl verifica `{ received, stored, rejected }`
- ✅ Frontend sin cambios

---

## ✅ Checklist de Evaluación del Proyecto

| # | Requisito | Estado | Evidencia |
|---|-----------|--------|-----------|
| 1 | Tabla `telemetry_events` con 8 columnas, 3 índices, write-only | ✅ | `core/database.py` — `CREATE TABLE ...` + `CREATE INDEX ...` |
| 2 | Bulk insert (single operation per batch) | ✅ | `executemany` con una sola sentencia INSERT |
| 3 | Response `{ received, stored, rejected }` | ✅ | `TelemetryBatchResponse` con 3 campos |
| 4 | Per-event validation; partial batch (not whole-batch 422) | ✅ | `model_validate()` en try/except, parseo suelto |
| 5 | `TelemetryEvent` model reutilizado sin cambios desde Fase 2 | ✅ | Mismo modelo en `routes/telemetry.py` |
| 6 | Zero frontend diffs | ✅ | Misma URL, mismo response format |
| 7 | Eventos en `telemetry_events` con `event_type`, `timestamp`, `tags` | ✅ | business + technical events |
| 8 | `tags` preserva dimensiones CONTEXT-specific | ✅ | warehouse, client_id, product_id, etc. |
| 9 | PR title `feat: telemetry event storage` | ✅ | |
| 10 | Screenshot tabla ≥5 filas (≥1 técnico + ≥1 negocio) | ✅ | Ver abajo |
| 11 | JSON response batch mixto | ✅ | Ver abajo |
| 12 | Frontend sin cambios | ✅ | Ver abajo |

---

## 🐳 Inicio Rápido (Docker)

```bash
# Iniciar todos los servicios
docker compose up -d

# Verificar que está corriendo
docker compose ps

# Ver logs de telemetría
docker compose logs -f api-backend

# Enviar evento de prueba
curl -X POST http://localhost:8001/telemetry/events \
  -H "Content-Type: application/json" \
  -d '{"events":[{"eventId":"test-0001","timestamp":"2026-08-27T12:00:00Z","sessionId":"session-001","userId":"user-001","event_type":"test_event","schemaVersion":"1.0","requestId":"req-001","properties":{"test":true}}]}'

# Consultar eventos almacenados
docker compose exec postgres psql -U app -d inventory
  # \x
  # SELECT * FROM telemetry_events;
```

---

## 📸 Evidencia de Verificación (Resultados Reales)

### Batch mixto (válidos + inválido)

```json
// Request: 2 eventos válidos + 1 inválido
{
  "events": [
    {
      "eventId": "770e8400-e29b-41d4-a716-446655440010",
      "timestamp": "2026-08-27T11:00:00Z",
      "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "userId": "user-002",
      "event_type": "inbound_order_created",
      "schemaVersion": "1.0",
      "requestId": "req-010",
      "properties": {
        "warehouse": "zaragoza",
        "client_id": "cliente-01",
        "product_id": "SKU-001",
        "product_category": "fashion",
        "quantity": 100
      }
    },
    {
      "eventId": "invalido-no-uuid",
      "timestamp": "not-a-date",
      "sessionId": "",
      "userId": "",
      "event_type": "INVALID_TYPE",        // Mayúsculas → inválido
      "schemaVersion": "malformed",         // No es semver → inválido
      "requestId": "",
      "properties": null
    },
    {
      "eventId": "880e8400-e29b-41d4-a716-446655440011",
      "timestamp": "2026-08-27T11:01:00Z",
      "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "userId": "user-002",
      "event_type": "api_endpoint_error",
      "schemaVersion": "1.0",
      "requestId": "req-011",
      "properties": {
        "endpoint": "/api/v1/items",
        "status_code": 500,
        "error": "Internal Server Error"
      }
    }
  ]
}

// Response
{
  "received": 3,
  "stored": 2,
  "rejected": 1
}
```

### Consulta SQL de eventos almacenados

```sql
SELECT event_type, level, value, message, service FROM telemetry_events ORDER BY timestamp;

      event_type       | level | value |         message          |  service
-----------------------+-------+-------+--------------------------+------------
 login_attempted       | info  |       | Login attempted          | backoffice
 login_failed          | error |       | Login failed             | backoffice
 login_attempted       | info  |       | Login attempted          | backoffice
 login_failed          | error |       | Login failed             | backoffice
 session_started       | info  |       | Session started          | backoffice
 inbound_order_created | info  |   100 | Inbound order created    | api
 api_endpoint_error    | error |       | API error: /api/v1/items | api
(7 rows)
```

### Verificación de tabla completa con tags

```
 id         | b8cb24dd-9fd2-4e50-9478-c0909d1917c4
 timestamp  | 2026-08-27 11:01:00+00
 event_type | api_endpoint_error
 level      | error
 value      |
 message    | API error: /api/v1/items
 service    | api
 tags       | {"error": "Internal Server Error", "userId": "user-002",
             |  "eventId": "880e8400-...", "endpoint": "/api/v1/items",
             |  "status_code": 500, "schemaVersion": "1.0"}

 id         | 54e3e2a2-da05-4d1f-a3d8-105526198b07
 timestamp  | 2026-08-27 11:00:00+00
 event_type | inbound_order_created
 level      | info
 value      | 100
 message    | Inbound order created
 service    | api
 tags       | {"userId": "user-002", "warehouse": "zaragoza",
             |  "client_id": "cliente-01", "product_id": "SKU-001",
             |  "product_category": "fashion", "schemaVersion": "1.0"}
```

### Declaración de frontend sin cambios

El frontend (`uis/backoffice/lib/telemetry.ts`) no se modificó. Los únicos cambios en `uis/backoffice/` son archivos de infraestructura Docker (`.dockerignore`, `Dockerfile`, `.gitignore`).

---

## 🔗 Enlaces

- [Plan de Telemetría](../docs/telemetry/telemetry-plan.md) — Documento de diseño Fase 1
- [Captura de Telemetría](../docs/telemetry/CAPTURE_PROJECT.md) — Documentación Fase 2
- [Esquemas JSON](../docs/telemetry/event-schemas.json) — 23 esquemas validables
- [Docker Infra](../../infra/README.md) — Documentación Docker
- **Rama:** `feature/telemetry-storage`
