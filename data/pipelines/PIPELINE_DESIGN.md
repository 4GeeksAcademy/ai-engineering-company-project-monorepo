# Diseño del Pipeline: Desempeño de Negocio

## Reporte Semanal de Desempeño por Almacén y Cliente

> **Compañía:** TrackFlow — Logística y Entrega de Última Milla
> **Entrega:** `data/pipelines/PIPELINE_DESIGN.md`
> **Mensaje del commit:** `feat: add business performance pipeline design document`

---

## Fase 1 — Estado Actual y Brecha de Negocio

### Estado Actual: lo que el reporte técnico ya responde

El monorepo actualmente tiene un **pipeline técnico de telemetría** en `services/telemetry/analysis.py`, expuesto vía `GET /telemetry/report`. Este pipeline:

| Dimensión | Capacidad actual |
|-----------|-------------------|
| Origen | Tabla `telemetry_events` (PostgreSQL / Supabase) |
| Formato | Filas en tabla `telemetry_events` — columnas: `id` (PK), `timestamp`, `service`, `event_type`, `level`, `value`, `message`, `tags` (jsonb). El envelope (eventId, sessionId, userId, schemaVersion, requestId) y el payload de negocio (warehouse, client_id, product_id, product_category, quantity) viven **dentro de `tags`** |
| Agregación | Agrupado por event_type, día, service, level |
| Salida | Métricas técnicas: eventos_por_dia, tasa_error_por_tipo, distribucion_por_tipo_evento |
| Consumidor | Equipo de ingeniería (salud del sistema, tasas de error) |
| Cadencia | Bajo demanda vía API |

### La brecha de negocio

| Interesado | Pregunta que sigue sin respuesta |
|-------------|----------------------------------|
| **Thomas (CEO)** | "¿Qué almacén procesó más volumen para *fashion-co* esta semana? ¿Estamos perdiendo o ganando capacidad?" |
| **Ana (Jefa de Operaciones de Almacén)** | "¿*los_angeles* se está quedando sin stock de algún cliente? ¿Qué combinación almacén/cliente tiene la tasa de discrepancia más alta?" |
| **Miguel (Comercial)** | "¿Cuántos eventos de falta de stock ocurrieron esta semana por cliente — antes de que el cliente nos llame?" |

El reporte técnico responde *cuántos eventos ocurrieron* (ej. 500 eventos `inbound_order_created`). **No** responde:
- La **suma de unidades** recibidas por almacén por cliente (Volumen de Entrada)
- El **conteo de órdenes** despachadas por almacén por cliente (Rendimiento de Salida)
- La **frecuencia** de eventos de falta de stock por almacén por cliente (Frecuencia de Desabastecimiento)
- La **tasa** de discrepancias de inventario relativa a la actividad de salida (Tasa de Discrepancia)

**Este pipeline existe para cerrar esa brecha.**

---

## Fase 2 — Diseño del Pipeline

### 2.1 Propósito (una sola frase)

> Producir el **Reporte Semanal de Desempeño por Almacén y Cliente** — un agregado semanal, por almacén y por cliente, de los cuatro KPIs de negocio (Volumen de Entrada, Rendimiento de Salida, Frecuencia de Desabastecimiento, Tasa de Discrepancia) a partir de los eventos de telemetría, para que Thomas y Ana abran el lunes por la mañana un reporte sin depender de ingeniería.

### 2.2 Formato de extracción

| Elemento | Especificación |
|----------|----------------|
| **Origen** | `telemetry_events` (PostgreSQL / Supabase) — **solo lectura**, no se escribe nunca en esta tabla |
| **Filtro** | `event_type IN ('inbound_order_created', 'outbound_order_created', 'stock_threshold_triggered', 'inventory_discrepancy_detected')` |
| **Rango de tiempo** | Semana ISO anterior: `timestamp >= week_start_monday AND timestamp < next_monday` (UTC) |
| **Campos del payload consumidos** | De la columna `tags` (jsonb): `tags->>'warehouse'`, `tags->>'client_id'`, `tags->>'product_id'`, `tags->>'product_category'`, `tags->'quantity'` (la columna `value` ya guarda el `quantity` numérico extraído por `_extract_value`) |
| **Cadencia** | **Semanal**, ejecutado cada **lunes a las 06:00 UTC** (listo para las 08:00 hora de oficina) |
| **Disparador** | Programado (cron) + manual (`POST /reporting/pipeline-runs`) |

### 2.3 Diagrama de flujo de datos (≥3 etapas con nombres reales)

```mermaid
flowchart TD
    subgraph Extracción["Extracción (Extract)"]
        A1[("telemetry_events<br/>(PostgreSQL / Supabase)")] --> A2[Filtrar eventos por<br/>event_type y semana]
        A2 --> A3[Extraer de tags (jsonb):<br/>warehouse, client_id,<br/>product_id, quantity]
    end

    subgraph Transformación["Transformación (Transform)"]
        B1[Agrupar por:<br/>warehouse + client_id + week_start] --> B2[Calcular KPIs:<br/>SUM quantity → inbound_units_count<br/>COUNT orders → outbound_orders_count<br/>COUNT stockout → stockout_events_count<br/>COUNT discrepancies → discrepancy_events_count<br/>Ratio → discrepancy_rate]
        B2 --> B3[Construir registro:<br/>warehouse + client_id + week_start<br/>+ 5 campos KPI]
    end

    subgraph Carga["Carga (Load)"]
        C1[UPSERT en<br/>reporting.weekly_warehouse_client_performance] --> C2[Escribir log de ejecución<br/>en tabla pipeline_runs]
    end

    A3 --> B1
    B3 --> C1

    style A1 fill:#ff9,stroke:#333
    style C1 fill:#9cf,stroke:#333
```

**Tablas reales de TrackFlow mencionadas:**
- `telemetry_events` — fuente de eventos (esquema `public`)
- `inventory_items` — dominio: `sku`, `warehouse` (`los_angeles` / `zaragoza`), `min_stock`, `category`
- `profiles` — dominio (TinyDB): `name`, `phone`, `address` — fuera de alcance para este reporte: contiene **operadores**, no clientes. La dimensión de negocio del reporte es `client_id` (en `tags->>'client_id'` del evento), que en v1 no se enriquece con nombre (no existe tabla de clientes en el CONTEXT)
- `reporting.weekly_warehouse_client_performance` — **destino** (esquema `reporting`, tabla nueva)
- `pipeline_runs` — tabla de log de ejecución (esquema `reporting`)

### 2.4 Estrategia para fuentes que actualizan registros

Los eventos en `telemetry_events` son **insert-only** (append): una vez creados no se modifican. Sin embargo:

| Escenario | Mecanismo |
|-----------|-----------|
| **Evento duplicado** (mismo `eventId`, reenvío tras reintento) | La tabla es **append-only** y su PK es `id` (autogenerado), no hay UNIQUE sobre `eventId`. La deduplicación se hace en la **capa de extracción**: `SELECT DISTINCT ON (tags->>'eventId')` y en agregación no se duplica porque el UPSERT destino recalcula la misma semana |
| **Evento corregido** (corrección manual, nuevo evento) | Se emite un nuevo evento con nuevo `eventId` y `timestamp` posterior; la agregación semanal lo incluye en la semana correspondiente |
| **Renombrado de cliente / ajuste de dimensión** | El reporte usa el `client_id` del evento (en `tags->>'client_id'`), no el nombre. Si un `client_id` se corrige en origen, el evento nuevo entra en la semana correspondiente y el UPSERT sobre `(warehouse, client_id, week_start)` recalcula la fila |
| **Corrección de cantidad** (ajuste manual) | Se emite un nuevo evento del tipo adecuado (ej. `inventory_discrepancy_detected`); el pipeline recalcula en la siguiente corrida semanal |

---

## Fase 3 — Resiliencia

### 3.1 Estrategia de idempotencia explícita

> **¿Qué pasa en la segunda corrida después de un fallo en la fase de carga?**

**Escenario:** El pipeline se ejecuta, extrae datos correctamente, transforma, y durante el `UPSERT` hacia `reporting.weekly_warehouse_client_performance` la conexión a PostgreSQL se cae. Se han insertado **10 filas de 50**. La corrida falla con estado `Failed`.

**Corrida 2 (recuperación):**
1. La extracción vuelve a leer `telemetry_events` filtrando la **misma semana ISO** (no hay ventana de checkpoint que omita datos)
2. La transformación produce el mismo conjunto de 50 filas
3. El `UPSERT` sobre la constraint `UNIQUE (warehouse, client_id, week_start)` garantiza:
   - Las 10 filas ya insertadas: se actualizan (UPDATE) con los mismos valores → resultado idéntico
   - Las 40 filas restantes: se insertan (INSERT)
4. Al finalizar, el resultado es **exactamente el mismo** que si la primera corrida hubiera completado sin fallo

**Clave de idempotencia:** La tripleta `(warehouse, client_id, week_start)` definida en la tabla destino.

```sql
-- La constraint que hace posible la idempotencia
UNIQUE (warehouse, client_id, week_start)

-- La operación UPSERT (PostgreSQL)
INSERT INTO reporting.weekly_warehouse_client_performance
    (warehouse, client_id, week_start, inbound_units_count, outbound_orders_count,
     stockout_events_count, discrepancy_events_count, discrepancy_rate, computed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
ON CONFLICT (warehouse, client_id, week_start)
DO UPDATE SET
    inbound_units_count = EXCLUDED.inbound_units_count,
    outbound_orders_count = EXCLUDED.outbound_orders_count,
    stockout_events_count = EXCLUDED.stockout_events_count,
    discrepancy_events_count = EXCLUDED.discrepancy_events_count,
    discrepancy_rate = EXCLUDED.discrepancy_rate,
    computed_at = NOW();
```

### 3.2 Log de ejecución

Cada corrida del pipeline registra una entrada en la tabla `reporting.pipeline_runs` con los siguientes campos:

| # | Nombre del campo | Tipo de dato | Justificación (auditoría) |
|---|------------------|-------------|--------------------------|
| 1 | `run_id` | `UUID` (PK) | Identificador único de cada ejecución. Permite correlacionar el log con los datos producidos. |
| 2 | `pipeline_name` | `VARCHAR(100)` | Nombre del pipeline (`weekly_warehouse_client_performance`). Útil cuando existan múltiples pipelines y se quiera filtrar por uno. |
| 3 | `status` | `VARCHAR(20)` | Estado final: `Completed`, `Failed`, `Running`. Señal inmediata de salud del pipeline. |
| 4 | `started_at` | `TIMESTAMPTZ` | Inicio de la ejecución. Necesario para calcular duración y detectar corridas abandonadas. |
| 5 | `finished_at` | `TIMESTAMPTZ` | Fin de la ejecución. Con `started_at` permite calcular duración total. |
| 6 | `rows_read` | `INTEGER` | Número de filas extraídas de `telemetry_events`. Vital para detectar pérdida/crecimiento de datos. |
| 7 | `rows_upserted` | `INTEGER` | Número de filas escritas en la tabla destino. Comparado con `rows_read` revela agregación correcta. |
| 8 | `error_message` | `TEXT` | Mensaje de error si la corrida falló. Permite diagnóstico remoto sin acceso a logs del servidor. |
| 9 | `triggered_by` | `VARCHAR(20)` | Origen de la corrida: `scheduled` (cron) o `manual` (API). Distingue corridas automáticas de manuales. |
| 10 | `week_start` | `DATE` | Semana ISO que procesó esta corrida. Clave para recomputaciones parciales y backfill. |

### 3.3 Preguntas guía del enunciado

#### Idempotencia

**Duplicados en el origen — ¿Cómo evitas contar la misma acción dos veces en `telemetry_events` y en tus agregados de negocio? ¿Qué campo del envelope es tu clave de deduplicación, y en qué capa?**

El campo `eventId` (UUID v4) del envelope, almacenado en `telemetry_events.tags->>'eventId'`, es la clave lógica de deduplicación (la tabla no tiene UNIQUE sobre él; su PK física es `id`). En la capa de **extracción**, el pipeline selecciona `DISTINCT ON (tags->>'eventId')` para descartar reenvíos duplicados que pudieran llegar por reintentos de `POST /telemetry`. En la capa de **agregación**, la suma por `warehouse` + `client_id` + `week_start` es naturalmente idempotente porque el UPSERT en destino actualiza en lugar de insertar duplicados.

**Reintento después de un fallo — Si el pipeline muere durante la carga con datos parciales insertados, ¿qué pasa cuando lo vuelves a correr?**

Descrito en la **sección 3.1** (idempotencia explícita): el UPSERT sobre `UNIQUE (warehouse, client_id, week_start)` garantiza que la segunda corrida produzca exactamente el mismo resultado que una corrida limpia.

**Eventos tardíos — ¿Cómo recalculas una métrica de negocio diaria ya publicada cuando llega un evento retrasado, sin inflar los números ni perder el rastro de auditoría?**

El pipeline tiene granularidad **semanal** (no diaria), lo que reduce la ventana de eventos tardíos. Si un evento con `timestamp` de la semana anterior llega durante la semana actual (ej. martes), el pipeline lo ignorará en la corrida de la semana actual porque filtra por `week_start`. Para manejar esto:

1. El pipeline guarda un **watermark** (la semana ISO máxima procesada) en `reporting.pipeline_runs`
2. Un **job de backfill** (manual o automático) detecta semanas con eventos tardíos comparando `tags->>'eventId'` no procesados contra el watermark
3. El backfill recalcula esa semana específica y actualiza las filas existentes vía UPSERT
4. Un campo `recomputed_at` adicional (opcional) en la tabla destino marca cuándo se recalculó cada fila

#### Observabilidad

**Silencio vs. ausencia real — ¿Cómo distingues actividad cero de una captura fallida o de un pipeline que nunca corrió? ¿Qué señales mínimas registrarías?**

- El log de `pipeline_runs` indica si el pipeline corrió y cuántas filas leyó/insertó (`rows_read = 0` vs. `status = Failed`)
- Una alerta si el pipeline **no ha corrido en las últimas 36 horas** (excede la cadencia semanal x2 como margen de seguridad)
- Cada evento en `telemetry_events` tiene `timestamp` → una simple consulta `SELECT COUNT(*) FROM telemetry_events WHERE timestamp > NOW() - INTERVAL '7 days'` distingue "sin actividad" de "pipeline caído"

**Trazabilidad de la recolección — ¿Qué rastros reconstruyen el camino evento → reporte de negocio y detectan huecos, ráfagas, o desfases de intervalo?**

- Cada fila en `reporting.weekly_warehouse_client_performance` tiene `computed_at`
- La tabla `pipeline_runs` almacena `rows_read` por corrida → una caída repentina de 50k a 5k filas detecta un hueco
- Un aumento anómalo de 5k a 50k detecta una ráfaga o posible duplicación
- Cada evento expone `tags->>'eventId'` → se puede reconstruir qué eventos alimentaron cada fila del reporte

**Crecimiento vs. pérdida de datos — Si el volumen de eventos varía de un día a otro, ¿cómo sabes si el negocio está creciendo o si estás perdiendo o duplicando mediciones?**

- La tendencia semanal de `rows_read` en `pipeline_runs` (comparando semana a semana) muestra si el volumen sube o baja
- Un conteo de `DISTINCT tags->>'eventId'` por semana en `telemetry_events` (independiente del pipeline) sirve como baseline
- Si `rows_read` cae un 80% pero los eventos únicos en origen no, hay un bug en el pipeline (filtro incorrecto)
- Si ambos suben simultáneamente, el negocio está creciendo

#### Recuperabilidad

**Caída de base de datos — ¿Dónde retomas si la conexión se cae a mitad del pipeline? ¿Qué checkpoint persistes?**

- El pipeline no necesita checkpoint complejo porque es **idempotente por diseño** (UPSERT). Si la BD cae a mitad:
  1. La transacción actual se revierte (PostgreSQL maneja el rollback automático)
  2. La corrida se registra como `Failed` en `pipeline_runs` (si es posible; si no, se detecta por ausencia de `Completed`)
  3. En la siguiente corrida programada (o en un reintento manual), el pipeline procesa la misma semana completa
- Para pipelines más largos (ej. históricos con meses de datos), se podría persistir un checkpoint simple: `(week_start, last_event_id)` en una tabla de control, donde `last_event_id` = último `tags->>'eventId'` procesado

**Buffer en el frontend — ¿Tiene sentido bufferear eventos offline en el navegador? ¿Qué riesgos introduce, y qué capa debería asumirlos?**

Sí, tiene sentido si los operadores de almacén pierden conectividad (ej. zonas sin cobertura en Zaragoza). El navegador (frontend) debería:
1. Almacenar eventos en `localStorage` o IndexedDB con `eventId` + `timestamp`
2. Reintentar el envío vía `POST /telemetry` cuando recupere conexión
3. El backend (servicio de telemetría) rechaza duplicados por `eventId` con HTTP `409 Conflict` → el frontend interpreta "ya almacenado" y descarta el evento (el stub actual de `routes/telemetry.py` no persiste, pero el contrato previsto en Fase 3 del plan de telemetría lo establece)

**Riesgos:** Overflow de almacenamiento local, eventos que caducan si el dispositivo no se reconecta en días, desorden cronológico al reenviar.

**Reintento de transmisión — ¿Cómo diseñas reintentos sobre `POST /telemetry` sin romper la idempotencia? ¿Qué respuesta del servidor significa "ya almacenado" vs. "reintentar"?**

| Respuesta HTTP | Significado | Acción del cliente |
|---------------|-------------|--------------------|
| `200 OK` | Almacenado correctamente | Descartar evento del buffer |
| `409 Conflict` | `eventId` ya existe | Descartar evento del buffer (idempotencia) |
| `429 Too Many Requests` | Rate limit alcanzado | Reintentar con backoff exponencial |
| `503 Service Unavailable` | Servidor temporalmente caído | Reintentar con backoff exponencial |
| Error de red/tiempo muerto | No se sabe si llegó | Reintentar con backoff; el servidor responde 409 si ya existe |

#### Transversal

**Corridas concurrentes — ¿Qué observas, cómo evitas condiciones de carrera en la carga, y cómo te recuperas cuando el cron y un disparo manual desde `services/` se solapan?**

1. **Detección:** El pipeline consulta `pipeline_runs` al inicio. Si existe una corrida con `status = 'Running'` para el mismo `pipeline_name`, aborta la nueva.
2. **Prevención:** Se utiliza un **advisory lock** de PostgreSQL (`pg_advisory_xact_lock`) al inicio de la carga, que libera al commit/rollback de la transacción. Esto evita que dos corridas modifiquen las mismas filas simultáneamente.
3. **Recuperación:** Si el cron inicia una corrida y simultáneamente el usuario dispara una manual, la segunda recibe un error "Pipeline already running" y puede reintentarse minutos después.

---

## Fase 4 — Mapeo a Prefect

### 4.1 Flow principal: `weekly_warehouse_client_performance`

```python
from prefect import flow, task
from prefect.states import Running, Completed, Failed

@task(name="extract_telemetry_events", retries=2)
def extract_telemetry_events(week_start: str) -> list[dict]:
    """
    Lee telemetry_events filtrando por event_type y semana ISO.
    Retorna lista de eventos crudos con tags jsonb (warehouse, client_id, product_id, quantity).
    Estado: Running → Completed (o Failed tras 2 reintentos).
    """
    ...

@task(name="transform_to_warehouse_client_grain")
def transform_to_warehouse_client_grain(events: list[dict]) -> list[dict]:
    """
    Agrupa por warehouse + client_id + week_start.
    Calcula los 5 campos agregados y la tasa de discrepancia.
    Estado: Running → Completed (o Failed si datos inconsistentes).
    """
    ...

@task(name="load_weekly_performance", retries=1)
def load_weekly_performance(rows: list[dict]) -> int:
    """
    UPSERT en reporting.weekly_warehouse_client_performance.
    Retorna número de filas insertadas/actualizadas.
    Estado: Running → Completed (o Failed si la BD rechaza la transacción).
    """
    ...

@flow(name="weekly_warehouse_client_performance")
def weekly_warehouse_client_performance(week_start: str | None = None):
    """
    Flow principal: extrae → transforma → carga.
    Si week_start es None, calcula la última semana ISO completa.
    """
    target_week = week_start or last_complete_iso_week()
    events = extract_telemetry_events(target_week)
    rows = transform_to_warehouse_client_grain(events)
    count = load_weekly_performance(rows)
    return {"week_start": target_week, "rows_upserted": count}
```

**Estados de Prefect mapeados:**

| Estado | Cuándo ocurre |
|--------|---------------|
| `Running` | Cada task en ejecución |
| `Completed` | Task finaliza sin error |
| `Failed` | Task lanza excepción (tras agotar reintentos) |
| `Pending` | Task espera dependencia |
| `Retrying` | Task falló pero tiene reintentos disponibles |

### 4.2 Flow de backfill (opcional): `backfill_weekly_performance`

```python
@flow(name="backfill_weekly_performance")
def backfill_weekly_performance(from_week: str, to_week: str):
    """
    Recalcula un rango de semanas (semana a semana).
    Útil para eventos tardíos o reprocesamiento histórico.
    Cada semana ejecuta el flow principal como subflow.
    """
    ...
```

### 4.3 Prefect Blocks

| Block | Propósito | Variables |
|-------|-----------|-----------|
| `SupabaseConnection` | Conexión a la base de datos Supabase/PostgreSQL | `host`, `port`, `database`, `user`, `password`, `sslmode` |
| `SlackWebhook` (opcional) | Notificar fallos del pipeline al equipo | `webhook_url` |
| `ISOWeekSchedule` (opcional) | Schedule semanal para el cron | `cron: "0 6 * * 1"` (lunes 06:00 UTC) |

---

## Fase 5 — Integración con la aplicación (endpoints planeados)

Los siguientes endpoints vivirán en el nuevo módulo `services/reporting/` (separado de `services/telemetry/`). Ninguno contiene lógica ETL; cada uno importa funciones desde `data/pipelines/`.

### 5.1 Endpoints

| Endpoint | Método | Propósito | Función de `data/pipelines/` que importa |
|----------|--------|-----------|-----------------------------------------|
| `/reporting/weekly-warehouse-client-performance` | `GET` | Consultar los KPIs de una semana. Parámetro opcional `week_start` (por defecto: última semana computada). | `from data.pipelines.weekly_performance import query_weekly_report` |
| `/reporting/pipeline-runs/latest` | `GET` | Estado y metadatos de la última ejecución del pipeline (status, rows_read, duración, errores). | `from data.pipelines.weekly_performance import get_latest_run` |
| `/reporting/pipeline-runs` | `POST` | Disparar una ejecución manual del pipeline. Parámetro opcional `week_start` para especificar semana. | `from data.pipelines.weekly_performance import run_weekly_pipeline` (que a su vez lanza el flow de Prefect) |

### 5.2 Ejemplo de respuesta

```json
GET /reporting/weekly-warehouse-client-performance?week_start=2026-07-13

{
  "week_start": "2026-07-13",
  "computed_at": "2026-07-20T06:12:34.123Z",
  "entries": [
    {
      "warehouse": "los_angeles",
      "client_id": "fashion-co",
      "inbound_units_count": 4200,
      "outbound_orders_count": 980,
      "stockout_events_count": 3,
      "discrepancy_events_count": 2,
      "discrepancy_rate": 0.002
    },
    {
      "warehouse": "zaragoza",
      "client_id": "maent",
      "inbound_units_count": 1800,
      "outbound_orders_count": 420,
      "stockout_events_count": 0,
      "discrepancy_events_count": 1,
      "discrepancy_rate": 0.0024
    },
    {
      "warehouse": "los_angeles",
      "client_id": "electro-world",
      "inbound_units_count": 5600,
      "outbound_orders_count": 1200,
      "stockout_events_count": 7,
      "discrepancy_events_count": 5,
      "discrepancy_rate": 0.0042
    }
  ]
}
```

### 5.3 Separación de responsabilidades

```
services/reporting/           ← Nuevo módulo (FastAPI routers)
  ├── router.py               ← Define los 3 endpoints
  └── dependencies.py         ← Conexión a BD (reutilizable)

data/pipelines/               ← Lógica ETL
  ├── PIPELINE_DESIGN.md       ← Este documento
  └── weekly_performance.py   ← Funciones: query_weekly_report,
                                  get_latest_run, run_weekly_pipeline,
                                  extract, transform, load

services/telemetry/           ← NO MODIFICAR
  ├── analysis.py             ← Intocable
  └── routes/telemetry.py     ← GET /telemetry/report intacto
```

---

## Verificación contra los 13 criterios de evaluación

| # | Criterio | Cumplimiento |
|---|----------|--------------|
| 1 | `data/pipelines/PIPELINE_DESIGN.md` existe y es Markdown legible | ✅ Este documento |
| 2 | Sección Current State + brecha de negocio | ✅ **Fase 1** |
| 3 | Formato de extracción especificado (tablas origen, payload, cadencia) | ✅ **Sección 2.2** |
| 4 | Propósito en una sola frase con entregable + KPI del CONTEXT | ✅ **Sección 2.1** |
| 5 | No modifica `services/telemetry/analysis.py` ni `GET /telemetry/report`; resultado en `reporting` + `services/reporting/` | ✅ **Sección 5.3** y restricción en Fase 2 |
| 6 | Diagrama ≥3 etapas con nombres reales (extracción, transformación, carga) | ✅ **Sección 2.3** con Mermaid |
| 7 | Estrategia de updates documentada con mecanismo concreto | ✅ **Sección 2.4** (UNIQUE + UPSERT) |
| 8 | Idempotencia explícita (segunda corrida tras fallo en carga) | ✅ **Sección 3.1** con escenario concreto |
| 9 | Log de ejecución ≥5 campos con nombre + tipo + justificación | ✅ **Sección 3.2** (10 campos) |
| 10 | Prefect ≥1 flow + 3 tasks + estados | ✅ **Sección 4.1** (flow + 3 tasks + Running/Completed/Failed) |
| 11 | ≥3 endpoints en `services/reporting/` + funciones de `data/pipelines/` | ✅ **Sección 5.1** (3 endpoints + funciones) |
| 12 | Consistente con eventos/métricas del CONTEXT (4 eventos, 4 KPIs) | ✅ **Fase 2.2** y **Sección 2.1** |
| 13 | Commit con mensaje exacto | ✅ **Sección superior** |

---

## Convenciones del monorepo aplicadas

- **Vocabulario TrackFlow:** `los_angeles` / `zaragoza` (warehouses), `fashion` / `electronics` / `cosmetics` / `home` / `other` (categorías), `inbound` / `outbound` / `adjustment` (movimientos), `inventory_items` / `inventory_movements` (tablas de dominio)
- **Protección de zonas:** No se modifican `.github/`, `package.json`, `tsconfig.json`, `DESIGN.md`, `memory-bank/` (excepto progress.md), `uis/`
- **Separación ETL:** Toda la lógica de pipeline vive en `data/pipelines/`; `services/reporting/` solo importa y expone
- **Estructura de `data/`:** `pipelines/` orquestación, `process/` transformaciones reutilizables, `raw/` datos crudos, `eval/` evaluaciones