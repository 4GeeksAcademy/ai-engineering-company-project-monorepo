# 🚀 Proyecto: Background Processes — Procesos en Segundo Plano

> **Módulo**: Asynchronous Processing and Offloading  
> **Rama**: `feature/nightly-export-cronjob`  
> **Fecha de inicio**: 2026-09-09  
> **Estado**: Pendiente

---

## 📌 Resumen del Proyecto

Implementar un **script nocturno de telemetría** (`nightly_export.py`) que se ejecute cada noche de forma automática como un **proceso completamente independiente de la API FastAPI**. El script debe:

1. Exportar los datos de telemetría del día anterior a CSV (si aún no se ha hecho)
2. Lanzar el pipeline de datos como subproceso
3. Dejar constancia en base de datos del estado de ejecución (`job_runs`)

Todo esto siguiendo la **máquina de estados** `pending → processing → completed | failed` y usando el estado `processing` como **distributed lock** natural.

---

## 🏗️ Arquitectura General

```
┌──────────────────────────────────────────────────────┐
│                   crontab (02:00 UTC)                 │
│  0 2 * * * python scripts/nightly_export.py          │
└──────────────────┬───────────────────────────────────┘
                   │ dispara
                   ▼
┌──────────────────────────────────────────────────────┐
│           scripts/nightly_export.py                   │
│                                                       │
│  1. Resuelve target_date (TARGET_DATE env o ayer UTC) │
│  2. Lock check: ¿processing activo? → aborta          │
│  3. Idempotencia: ¿completed existe? → skip           │
│  4. Crea registro pending → processing                │
│  5. Exporta telemetry_events → data/raw/*.csv         │
│  6. Lanza pipeline como subprocess                   │
│  7. mark_completed / mark_failed                      │
└──────────┬────────────────────────────────┬───────────┘
           │ escribe                        │ lanza
           ▼                                ▼
┌──────────────────┐          ┌──────────────────────────┐
│   job_runs       │          │  data/pipelines/         │
│   (SQLite)       │          │  pipeline.py             │
│                  │          │                           │
│ Tabla de control │          │ Pipeline ETL semanal     │
│ de orquestación  │          │ (escribe en              │
│ nocturna         │          │ pipeline_runs)            │
└──────────────────┘          └──────────────────────────┘
           │                                │
           ▼                                ▼
┌──────────────────┐          ┌──────────────────────────┐
│  data/raw/       │          │  telemetry_events.db     │
│  telemetry_*.csv │          │  (datos fuente)          │
│  (backup/audit ) │          │                           │
└──────────────────┘          └──────────────────────────┘
```

---

## 📂 Estructura de Archivos a Crear/Modificar

```
📦 monorepo/
 ┣ 📂 scripts/
 ┃ ┗ 🆕 nightly_export.py            # Script principal ejecutable
 ┃
 ┣ 📂 services/
 ┃ ┗ 📂 job_runner/
 ┃    ┣ 🆕 __init__.py               # Inicialización del módulo
 ┃    ┗ 🆕 job_runner.py             # Servicio de control de estado job_runs
 ┃
 ┣ 📂 data/
 ┃ ┗ 📂 raw/                         # Directorio para CSVs de backup
 ┃    ┗ (📄 telemetry_YYYY-MM-DD.csv) # Generado por el script
 ┃
 ┣ 📂 db/
 ┃ ┗ 🆕 migrations/
 ┃    ┗ 🆕 001_create_job_runs.sql   # Migración SQL
 ┃
 ┗ 📄 CRONJOB.md                     # Documentación del proyecto (opcional)
```

---

## ✅ Checklist Detallado (30 tareas)

### Fase 1: Modelo de Datos — `job_runs` (4 tareas)

| # | Tarea | Detalle | Archivo |
|---|-------|---------|---------|
| 1 | **Crear tabla `job_runs`** | `id` (TEXT PK), `job_name` (TEXT NOT NULL), `target_date` (TEXT NOT NULL), `status` (TEXT NOT NULL CHECK), `started_at`, `finished_at`, `error_message`, `created_at` | `db/migrations/001_create_job_runs.sql` + `services/job_runner/job_runner.py` |
| 2 | **Índice `(job_name, target_date)`** | Para consultas de idempotencia eficientes | Migración SQL |
| 3 | **Índice `(job_name, status)`** | Para lock check rápido | Migración SQL |
| 4 | **BD separada `job_runs.db`** | Se crea en `data/pipelines/job_runs.db` siguiendo la convención existente de `*.db` en `.gitignore` | `services/job_runner/job_runner.py` |

### Fase 2: Servicio de Control de Estado — `services/job_runner/` (6 tareas)

| # | Tarea | Detalle |
|---|-------|
| 5 | **Implementar `create_run(job_name, target_date)`** | Inserta registro con `status=pending` y `created_at`. Retorna el `id` |
| 6 | **Implementar `mark_processing(run_id)`** | Transición a `processing`, setea `started_at` |
| 7 | **Implementar `mark_completed(run_id)`** | Transición a `completed`, setea `finished_at` |
| 8 | **Implementar `mark_failed(run_id, error_message)`** | Transición a `failed`, setea `finished_at` + mensaje |
| 9 | **Implementar `has_processing_lock(job_name)`** | Retorna `True` si existe algún registro con `status='processing'` para ese `job_name` |
| 10 | **Implementar `has_completed_for_date(job_name, target_date)`** | Retorna `True` si existe un registro `completed` para ese `(job_name, target_date)` |

### Fase 3: Script Principal — `scripts/nightly_export.py` (6 tareas)

| # | Tarea | Detalle |
|---|-------|---------|
| 11 | **Resolver `target_date`** | Desde env `TARGET_DATE` (YYYY-MM-DD) o por defecto "ayer en UTC" con `datetime.now(timezone.utc).date() - timedelta(days=1)` |
| 12 | **Lock check inicial** | Si `has_processing_lock('nightly_export')` → log INFO `cancelled`, `exit(0)` silenciosamente |
| 13 | **Idempotencia check** | Si `has_completed_for_date('nightly_export', target_date)` → log INFO `skipped duplicate`, `exit(0)` |
| 14 | **Exportar CSV** | Si `data/raw/telemetry_{target_date}.csv` NO existe: consultar `telemetry_events` por fecha y exportar a CSV. Si existe: skip (idempotencia layer 2) |
| 15 | **Lanzar pipeline como subprocess** | `subprocess.run([sys.executable, '-m', 'data.pipelines.pipeline', '--week-start', week_start])` con captura de stdout/stderr y código de salida |
| 16 | **Registro de ejecución (ciclo de vida)** | `create_run` → `mark_processing` → try/bloque → `mark_completed` o `mark_failed`. `try/except/finally` garantiza que nunca quede en `processing` |

### Fase 4: Idempotencia y Bloqueo (2 tareas)

| # | Tarea | Detalle |
|---|-------|---------|
| 17 | **Lock vía `processing`** | Sin tabla/columna lock aparte. El estado `processing` es el distributed lock natural |
| 18 | **Idempotencia vía `target_date`** | `(job_name='nightly_export', target_date)` con status `completed` impide re-ejecuciíon |

### Fase 5: Disparador (4 tareas)

| # | Tarea | Detalle |
|---|-------|---------|
| 19 | **Configurar crontab** | `0 2 * * * cd /path/to/monorepo && /usr/bin/python scripts/nightly_export.py >> /var/log/nightly_export.log 2>&1` |
| 20 | **NO ejecutar dentro de FastAPI** | Prohibido APScheduler, `@repeat_every`, o hooks lifespan |
| 21 | **Variable de entorno `TARGET_DATE`** | Documentar que permite `TARGET_DATE=2025-01-15 python scripts/nightly_export.py` para pruebas |
| 22 | **Documentar expresiín cron en PR** | Incluir justificaciín de la decisiín (crontab vs scheduler) |

### Fase 6: Observabilidad (3 tareas)

| # | Tarea | Detalle |
|---|-------|---------|
| 23 | **Logs de ejecución INFO** | Inicio, fin, omisión por duplicado, cancelación por lock |
| 24 | **Logs de error ERROR** | Excepciones con stack trace |
| 25 | **Formato estándar de log** | Cada línnea incluye: timestamp, nombre del job (`nightly_export`), estado resultante, `target_date` |

### Fase 7: Verificación y Entrega (5 tareas)

| # | Tarea | Detalle |
|---|-------|---------|
| 26 | **Verificar ejecución autónoma** | `python scripts/nightly_export.py` funciona sin servidor FastAPI |
| 27 | **Verificar lock dual** | Dos instancias simultáneas: la segunda aborta con log de cancelación |
| 28 | **Verificar idempotencia** | Segunda ejecución mismmo día: log "skipped duplicate", sin duplicar CSV ni pipeline |
| 29 | **Verificar fail seguro** | Forzar fallo en pipeline: registro queda `failed`, no `processing`. `error_message` poblado |
| 30 | **Abrir Pull Request** | Ram `feature/nightly-export-cronjob` → `main`. Incluir: expresión cron + justificación, logs de ejemplo (éxito + fallo/bloqueo), fragmento de CSV generado, etiqueta `cronjob` |

---

## 🔄 Logs Esperados

### Ejecución exitosa
```0226-09-08T02:00:01Z INFO  nighty_export status=started target_date=2026-09-07
2026-09-08T02:00:05Z INFO nighty_export status=exported_csv target_date=2026-09-07 rows=24
2026-09-08T02:00:45Z INFO nighty_export status=pipeline_started target_date=2026-09-07
2026-09-08T02:01:30Z INFO nighty_export status=comleted target_date=2026-09-07
```

### Cancelaón por lock
```2026-09-08T02:00:01Z INFO nighty_export status=cancelled reason=procesing_lock target_date=2026-09-07```

### Omisiín por duplicado
```2026-09-08T02:00:01Z INFO nighty_export status=skpped reason=duplicate target_date=2026-09-07```

### Fallo
```2026-09-08T02:01:30Z ERROR nighty_export status=failed target_date=2026-09-07 error="pipeline exit code 1"```

---

## 📊 Mapa de Estados

```procesing (lock)
     ↑
     │
pending → → processing → → completed
                │
                ↘ → → → → faled
                        (try/except/finally)
```

| Estado | Significado | Siguiente |
|--------|-------------|-----------|
| `pending` | Registro creado, trabajo por comenzar | `processing` |
| `processing` | Trabajo en curso, actúa como distributed lock | `completed` | `failed` |
| `completed` | Ejecución exitosa, todo completado para `target_date` | Terminal|
| `failed` | Ejecución fallida, `eror_message` poblado | Terminal|

---

## 📝 Convenciones Técnicas

| Concepto | Valor |
|-----------|-------|
| **"ayer"** | `datetime.now(timezone.utc).date() - timedelta(days=1)` |
| **Zona horaria** | Siempre UTC |
| **Formato feha** | `YYYY-MM-DD` |
| **Var. entorno `TARGET_DATE`** | Sobreescribe fecha objetivo (opcional) |
| **Entry point pipeline** | `python -m data.pipelines.pipeline [--week-start YYYY-MM-DD]` |
| **BD de control** | `data/pipelines/job_runs.db` (SQLite) |
| **Repoete de CSV** | `data/raw/telemetry_YYY-MM-DD.csv` (solo backup, no input del pipeline) |
| **Sistema de logs** | Formato: `{timestamp} {level} nightly_export status={status} target_date={date} [error={msg}]`

---

## 📦 Cómo Entregar

1. ✅ Completar todos los checkpoints de este plan
2. ✅ Hacer push de la rama: `git push origin feature/nightly-export-cronjob`
3. ✅ A brir Pull Request desde `feature/nightly-export-cronjob` → `main`
4. ✅ Incluir en el cuerpo del PR:
-- Expresión cron y método elegido con justificación
-- Logs de ejemplo (éxito + falo/bloqueo)
-- Capura/fragmento del CSV generado
5. ✅ Aregar etiqueta `cronjob` al PR

---

> **Decisión de implementación**: Se usa `crontab` del SO (sistema) porque:
> - Mantiene el script completamente indepediente del hilo principal de FastAPI
> - No requiere dependencias adicionales (APScheduler, celery, etc.)
> - Es la única opción que garantiza que el script NO comarte proceso con la API
> - Documentado en: `0 2 * * cd /path && python srcipts/nightly_export.py`