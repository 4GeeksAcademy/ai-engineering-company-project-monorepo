# REPORT_PROJECT.md — Proyecto: Telemetría de tu compañía — Reporte Técnico

> **Proyecto:** Telemetría de tu compañía — Reporte Técnico  
> **Módulo:** Application Telemetry (Fase 4 de 4)  
> **Rama:** `feature/telemetry-report`  
> **Empresa:** TrackFlow  
> **Estado:** ✅ Completado  

---

## 📋 Resumen del proyecto

Construir un **dashboard de visualización** de telemetría que permita consultar, filtrar y analizar los eventos almacenados en PostgreSQL durante la Fase 3. Este es el **entregable final** del módulo Application Telemetry.

### Lo que se construyó

| Componente | Antes (Fase 3) | Ahora (Fase 4 - Reporte) |
|-----------|---------------|--------------------------|
| Consulta de eventos | ❌ No existía | ✅ `GET /telemetry/events` con filtros |
| Agregaciones | ❌ No existían | ✅ `GET /telemetry/summary` con métricas |
| Frontend de telemetría | ❌ No existía | ✅ Página `/telemetry` en backoffice |
| Dashboard visual | ❌ No existía | ✅ `TelemetryDashboard` con barras, tabla y filtros |
| Documentación | ❌ No existía | ✅ Este documento |

### Sin cambios en infraestructura

- Misma base de datos PostgreSQL (`telemetry_events`)
- Mismo backend FastAPI (puerto 8004)
- Mismo frontend (puerto 3001)
- Sin nuevas dependencias (no se instaló recharts — gráficos con Tailwind CSS nativo)

---

## 🏗️ Arquitectura

```
┌─────────────────────────────┐    GET /telemetry/summary     ┌──────────────────────────┐
│   Frontend (Backoffice)      │ ────────────────────────────→ │   API Backend (FastAPI)   │
│   /telemetry page            │                               │   routes/telemetry.py     │
│   TelemetryDashboard         │ ←──────────────────────────── │   (Fase 4 - Reporte)     │
│   (Client Component)         │    { total_events,            │                          │
│                              │      by_event_type[],         │                          │
│                              │      by_service[],            │                          │
│                              │      by_level[],              │                          │
│                              │      by_day[],                │                          │
│                              │      recent_events[] }        │                          │
└─────────────────────────────┘                               └───────────┬──────────────┘
                                                                          │
                                                                          ▼
                                                                 ┌──────────────────────────┐
                                                                 │   PostgreSQL              │
                                                                 │   telemetry_events        │
                                                                 │   (Read + Write)         │
                                                                 └──────────────────────────┘
```

### Flujo de datos

1. Usuario navega a `/telemetry` en el backoffice
2. `TelemetryDashboard` monta y llama `fetchTelemetrySummary()` + `fetchTelemetryEvents()`
3. Backend ejecuta consultas SQL parametrizadas contra `telemetry_events`
4. Backend devuelve datos agregados (summary) y eventos paginados (events)
5. Dashboard renderiza tarjetas, gráficos de barras y tabla de eventos
6. Usuario puede filtrar por tipo, servicio o nivel y recargar eventos

---

## 📦 Entregables

### Fase 1 — Endpoints GET de consulta

#### `GET /telemetry/events`

Obtiene eventos individuales con filtros opcionales.

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `event_type` | `string` | No | Filtrar por tipo de evento |
| `service` | `string` | No | Filtrar por servicio (`backoffice`, `api`) |
| `level` | `string` | No | Filtrar por nivel (`info`, `warn`, `error`) |
| `from_date` | `string` (ISO 8601) | No | Fecha inicio del rango |
| `to_date` | `string` (ISO 8601) | No | Fecha fin del rango |
| `limit` | `integer` | No | Máximo de eventos (default 50, max 200) |
| `offset` | `integer` | No | Desplazamiento para paginación |

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "timestamp": "2026-07-26T14:30:00Z",
      "service": "backoffice",
      "event_type": "page_view",
      "level": "info",
      "value": null,
      "message": "Usuario navegó a /dashboard",
      "tags": {}
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### `GET /telemetry/summary`

Obtiene métricas agregadas de todos los eventos.

**Response:**
```json
{
  "total_events": 1500,
  "by_event_type": [
    { "label": "page_view", "count": 800 },
    { "label": "inbound_receipt", "count": 300 }
  ],
  "by_service": [
    { "label": "backoffice", "count": 1000 },
    { "label": "api", "count": 500 }
  ],
  "by_level": [
    { "label": "info", "count": 1200 },
    { "label": "warn", "count": 200 },
    { "label": "error", "count": 100 }
  ],
  "by_day": [
    { "label": "2026-07-01", "count": 45 },
    { "label": "2026-07-02", "count": 32 }
  ],
  "recent_events": [
    {
      "id": "uuid",
      "timestamp": "2026-07-26T14:30:00Z",
      "service": "backoffice",
      "event_type": "page_view",
      "level": "info",
      "message": "Usuario navegó a /dashboard"
    }
  ]
}
```

### Fase 2 — Frontend helper `lib/telemetry-api.ts`

| Función | Descripción |
|---------|-------------|
| `fetchTelemetryEvents(params?)` | GET a `/telemetry/events` con query params |
| `fetchTelemetrySummary()` | GET a `/telemetry/summary` |

**Tipos exportados:**

| Tipo | Campos |
|------|--------|
| `TelemetryEventRecord` | `id`, `timestamp`, `service`, `event_type`, `level`, `value?`, `message?`, `tags` |
| `TelemetryQueryResponse` | `events[]`, `total`, `limit`, `offset` |
| `TelemetrySummaryItem` | `label`, `count` |
| `TelemetrySummaryResponse` | `total_events`, `by_event_type[]`, `by_service[]`, `by_level[]`, `by_day[]`, `recent_events[]` |

### Fase 3 — Dashboard `components/telemetry-dashboard.tsx`

Componente cliente (`"use client"`) que renderiza:

| Sección | Descripción | Visualización |
|---------|-------------|---------------|
| **Tarjetas de resumen** | Total eventos, tipos distintos, servicios, días con datos | 4 tarjetas con iconos |
| **Por tipo de evento** | Distribución de eventos por `event_type` | Barras horizontales (indigo) |
| **Por nivel** | Distribución por severidad (`info`/`warn`/`error`) | Barras horizontales (sky/amber/rose) |
| **Por servicio** | Distribución por origen (`backoffice`/`api`) | Barras horizontales (violet) |
| **Por día** | Timeline de eventos últimos 30 días | Barras horizontales (cyan) |
| **Eventos recientes** | Tabla paginada con filtros por tipo/servicio/nivel | Tabla responsive + select filters |

**Estados del componente:**

| Estado | Comportamiento |
|--------|---------------|
| Cargando | Spinner animado centrado |
| Error | Mensaje con botón de reintento |
| Sin datos | Mensaje informativo con ilustración |
| Con datos | Dashboard completo con todas las secciones |

### Fase 4 — Página `/telemetry`

| Aspecto | Implementación |
|---------|---------------|
| Ruta | `app/telemetry/page.tsx` |
| Componente | Dynamic import con `ssr: false` |
| Loading | "Cargando reporte de telemetría..." con spinner |
| PageTracker | Incluido para auto-telemetría |

---

## ✅ Checklist de Evaluación del Proyecto

| # | Requisito | Estado | Evidencia |
|---|-----------|--------|-----------|
| 1 | Backend expone GET /telemetry/events con filtros | ✅ | `routes/telemetry.py` — query endpoint |
| 2 | Backend expone GET /telemetry/summary con agregaciones | ✅ | `routes/telemetry.py` — summary endpoint |
| 3 | Las consultas SQL son parametrizadas | ✅ | `$1`, `$2` syntax con asyncpg |
| 4 | Paginación implementada (limit/offset) | ✅ | Limit default 50, max 200 |
| 5 | Frontend tiene helper de API para telemetría | ✅ | `lib/telemetry-api.ts` |
| 6 | Página /telemetry existe en backoffice | ✅ | `app/telemetry/page.tsx` |
| 7 | Dashboard muestra total de eventos | ✅ | SummaryCard + CountIcon |
| 8 | Dashboard muestra distribución por tipo | ✅ | BarChart con barras indigo |
| 9 | Dashboard muestra distribución por servicio | ✅ | BarChart con barras violet |
| 10 | Dashboard muestra distribución por nivel | ✅ | BarChart con colores semánticos |
| 11 | Dashboard muestra timeline por día | ✅ | BarChart con barras cyan |
| 12 | Dashboard muestra eventos recientes en tabla | ✅ | Tabla con filtros interactivos |
| 13 | Dashboard maneja estado de carga | ✅ | Spinner animado |
| 14 | Dashboard maneja estado de error | ✅ | Mensaje + botón reintentar |
| 15 | Dashboard maneja estado sin datos | ✅ | Mensaje informativo |
| 16 | Sin dependencias externas de gráficos | ✅ | Tailwind CSS nativo |
| 17 | Sin cambios en infraestructura existente | ✅ | Mismos puertos, mismo Docker |
| 18 | Rama creada y documentada | ✅ | `feature/telemetry-report` |

---

## 📝 Notas técnicas

### Decisiones de diseño

1. **Sin librería de gráficos:** No se instaló recharts ni d3 para evitar inflar dependencias. Las barras horizontales con Tailwind CSS son suficientemente expresivas para un reporte técnico interno.

2. **SSR desactivado:** El dashboard usa `dynamic(() => import(...), { ssr: false })` porque accede a `window` (a través del PageTracker) y necesita `useEffect` del lado cliente.

3. **Filtros del lado del cliente:** Los filtros de tipo/servicio/nivel se aplican mediante el backend (no filtrado local), recargando eventos con los parámetros seleccionados.

4. **Misma base de datos:** No se crearon tablas adicionales. Todo se consulta desde `telemetry_events`.

### Endpoints implementados

| Método | Ruta | Descripción | Líneas |
|--------|------|-------------|--------|
| POST | `/telemetry/events` | Ingesta de eventos (Fase 3) | ~60 |
| GET | `/telemetry/events` | Consulta con filtros (Fase 4) | ~40 |
| GET | `/telemetry/summary` | Agregaciones (Fase 4) | ~50 |

### Archivos modificados/creados

```
docs/telemetry/REPORT_PROJECT.md          ← NUEVO (este documento)
services/api/routes/telemetry.py          ← MODIFICADO (+ GET endpoints)
uis/backoffice/lib/telemetry-api.ts       ← NUEVO
uis/backoffice/components/telemetry-dashboard.tsx  ← NUEVO
uis/backoffice/app/telemetry/page.tsx     ← NUEVO
```

---

## 🔗 Enlaces

- [Plan de Telemetría](telemetry-plan.md)
- [Fase 1 — Catálogo](TELEMETRY_PROJECT.md)
- [Fase 2 — Captura](CAPTURE_PROJECT.md)
- [Fase 3 — Almacenamiento](STORAGE_PROJECT.md)
- **→ Fase 4 — Reporte (este documento)** ✅
- [Esquemas de eventos](event-schemas.json)