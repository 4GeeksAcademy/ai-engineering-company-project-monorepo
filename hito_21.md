# Hito 21 — Job nocturno de telemetría: export a CSV, pipeline y registro en `job_runs`

Este documento explica el script nocturno del ticket **#DEV-53**. Cada noche, sin que nadie lo
lance, el script exporta a CSV la telemetría del día anterior, lanza el pipeline de datos y deja
constancia en la base de datos de qué pasó y cuándo. Está pensado para que alguien que no
estuvo en el hito entienda qué se hizo, por qué se hizo así y cómo se comprobó.

Entregables:

- [scripts/nightly_export.py](scripts/nightly_export.py): el script (`python scripts/nightly_export.py`).
- [services/job_runner/](services/job_runner/__init__.py): la lógica de estado de `job_runs`
  (máquina de estados, lock e idempotencia).
- [services/job_runner/sql/001_job_runs.sql](services/job_runner/sql/001_job_runs.sql): la
  migración de la tabla `job_runs`.
- [docker/scheduler/](docker/scheduler/Dockerfile) y el servicio `nightly-export` de
  [docker-compose.yml](docker-compose.yml): el disparador (cron `30 2 * * *`, UTC).
- [tests/jobs/](tests/jobs/test_nightly_export.py): 55 tests nuevos; uno más en
  [tests/reporting/test_cli.py](tests/reporting/test_cli.py).

Rama: `feature/nightly-telemetry-export` (sale de `feature/business-performance-pipeline-production`,
la del hito 20, porque lanza el pipeline de ese hito).

| Commit | Fase |
|---|---|
| `e5227b7` | Fase 1 — Tabla `job_runs` y su migración |
| `eeca8f4` | Fase 2 — `services/job_runner`: estados, lock e idempotencia |
| `5aa0e16` | Fase 3 — `scripts/nightly_export.py` |
| `399da86` | Fase 4 — Disparador: contenedor scheduler con supercronic |
| `a32797f` | Fase 4 (corrección) — el crontab siempre con finales de línea LF |
| (este documento) | Fase 5 — Documentación |

---

## Índice

1. [El encargo](#1-el-encargo)
2. [Conceptos básicos](#2-conceptos-básicos)
3. [Arquitectura: quién escribe qué](#3-arquitectura-quién-escribe-qué)
4. [Fase 1 — La tabla `job_runs`](#4-fase-1--la-tabla-job_runs)
5. [Fase 2 — `services/job_runner`](#5-fase-2--servicesjob_runner)
6. [Fase 3 — El script](#6-fase-3--el-script)
7. [Fase 4 — El disparador](#7-fase-4--el-disparador)
8. [Cuándo hice commit y por qué](#8-cuándo-hice-commit-y-por-qué)
9. [Problemas que aparecieron y cómo se resolvieron](#9-problemas-que-aparecieron-y-cómo-se-resolvieron)
10. [Cómo se comprobó](#10-cómo-se-comprobó)
11. [Cómo arrancarlo y probarlo](#11-cómo-arrancarlo-y-probarlo)
12. [Decisiones discutibles (y cómo defenderlas)](#12-decisiones-discutibles-y-cómo-defenderlas)
13. [Lo que queda pendiente](#13-lo-que-queda-pendiente)
14. [Cuerpo del PR](#14-cuerpo-del-pr)
15. [Archivos creados y modificados](#15-archivos-creados-y-modificados)
16. [Checklist de evaluación](#16-checklist-de-evaluación)
17. [Glosario](#17-glosario)

---

## 1. El encargo

El ticket pide un script que se ejecute solo cada noche y que:

1. exporte a CSV la telemetría del día anterior, si aún no se ha exportado;
2. lance el pipeline de datos;
3. deje constancia en la base de datos de qué pasó y cuándo.

Criterios de aceptación del tech lead:

| Criterio | Dónde se cumple |
|---|---|
| Proceso independiente de la API, nunca en el hilo de FastAPI | Contenedor `nightly-export` propio; el script no importa FastAPI ([§7](#7-fase-4--el-disparador)) |
| Si ya está corriendo, la segunda instancia aborta en silencio | Lock vía `status = 'processing'` ([§5.2](#52-el-lock-es-el-estado-processing)) |
| Si falla, el registro queda en `failed`, nunca en `processing` | `tracked_run` con try/except/finally y `fail_stale_runs` ([§5.4](#54-ningún-registro-zombi)) |
| Idempotente: dos ejecuciones del mismo día = una | `has_completed_for_date` + índice único parcial ([§5.3](#53-idempotencia-por-target_date)) |
| Cada ejecución con timestamp, estado y error | Columnas de `job_runs` ([§4](#4-fase-1--la-tabla-job_runs)) |
| Script en `scripts/`, lógica de estado en `services/` | `scripts/nightly_export.py` y `services/job_runner/` |
| Disparador en crontab o scheduler, justificado en el PR | Contenedor con supercronic ([§7](#7-fase-4--el-disparador), [§14](#14-cuerpo-del-pr)) |

Y dos aclaraciones que cambian el diseño:

- **El CSV es un backup, no la entrada del pipeline.** El pipeline sigue leyendo `telemetry_events`
  desde la base de datos (marca de agua). No se le conecta al archivo.
- **«Ayer» es el día calendario anterior en UTC**, y `TARGET_DATE=YYYY-MM-DD` lo cambia sin tocar
  código.

### Adaptación al repo

El ticket da como comando de referencia `python -m data.pipelines.telemetry_kpi_daily.run
--no-prefect` («o tu entry point CLI del Hito 6»). En este repo ese módulo no existe: el pipeline
es el de los hitos 18–20, con su CLI `python data/pipelines/pipeline.py`. No tiene modo
`--no-prefect`: sin servidor de Prefect, arranca uno efímero dentro del propio proceso. Así que el
script lanza ese CLI.

---

## 2. Conceptos básicos

### Job programado

Un programa que se ejecuta solo, a una hora fija, sin que nadie lo lance. Aquí lo lanza **cron**,
que lee una línea como `30 2 * * *` («minuto 30, hora 2, cualquier día») y ejecuta el comando a
esa hora.

### Máquina de estados

La fila de cada ejecución solo puede pasar por estos estados, en este orden:

```
pending ──► processing ──► completed
   │             │
   └─────────────┴───────► failed
```

- `pending`: la ejecución está registrada pero aún no tiene el lock.
- `processing`: tiene el lock y está trabajando.
- `completed` / `failed`: terminó. Son estados finales y una fila que llega a uno de ellos no
  cambia más.

### Lock (cerrojo)

Un mecanismo que garantiza que solo un proceso hace algo a la vez. Aquí no hay tabla de locks: el
propio estado `processing` es el lock (ver [§5.2](#52-el-lock-es-el-estado-processing)).

### Idempotencia

Una operación es idempotente si hacerla dos veces deja todo igual que hacerla una. Aquí: ejecutar
el script dos veces sobre el mismo día deja el mismo CSV, la misma fila en `job_runs` y una sola
llamada al pipeline.

### Zombi

Una fila que se queda en `processing` para siempre porque el proceso que la abrió murió sin
cerrarla. Es peligrosa por partida doble: miente sobre el estado y, como `processing` es el lock,
bloquea todas las ejecuciones siguientes.

---

## 3. Arquitectura: quién escribe qué

```
cron (contenedor nightly-export, 02:30 UTC)
  └─ python scripts/nightly_export.py                     proceso 1 · escribe public.job_runs
       ├─ lee telemetry_events (día objetivo) ──► data/raw/telemetry_YYYY-MM-DD.csv   (backup)
       └─ subprocess: python data/pipelines/pipeline.py   proceso 2 · escribe reporting.pipeline_runs
            └─ lee telemetry_events (marca de agua) ──► reporting.weekly_warehouse_client_performance
```

Dos tablas de registro, dos capas, sin fusionarlas:

| | `public.job_runs` (hito 21) | `reporting.pipeline_runs` (hito 19) |
|---|---|---|
| La escribe | el script nocturno | el pipeline, durante su corrida |
| Una fila por | ejecución del job (un día) | corrida del pipeline (una o varias semanas) |
| Responde a | ¿se hizo el trabajo de la noche del día X? | ¿qué calculó el pipeline, con qué marca de agua? |
| Estados | `pending`, `processing`, `completed`, `failed` | `running`, `completed`, `failed` |
| Clave de idempotencia | `(job_name, target_date)` | `(warehouse, client_id, week_start)` en la tabla destino |

Se enlazan sin duplicar datos. El script lanza el pipeline con `--triggered-by
nightly_export:<id de job_runs>`, así que `pipeline_runs.triggered_by` dice qué ejecución nocturna
lo lanzó, y `job_runs.details.pipeline_run_id` guarda el id de la corrida del pipeline. Se puede ir
de una a otra en las dos direcciones.

---

## 4. Fase 1 — La tabla `job_runs`

```sql
create table if not exists public.job_runs (
  id             uuid primary key default gen_random_uuid(),
  job_name       text not null,
  target_date    date not null,                       -- día procesado: clave de la idempotencia
  status         text not null default 'pending'
                 check (status in ('pending', 'processing', 'completed', 'failed')),
  started_at     timestamptz,                         -- cuándo pasó a processing
  finished_at    timestamptz,                         -- cuándo pasó a completed o failed
  error_message  text,                                -- la excepción, si failed
  details        jsonb not null default '{}',         -- qué hizo: CSV, filas, comando, run del pipeline
  created_at     timestamptz not null default now(),  -- cuándo se registró (pending)
  check (status <> 'processing' or started_at is not null),
  check (status not in ('completed', 'failed') or finished_at is not null),
  check (status <> 'failed' or error_message is not null)
);
```

Tres índices:

| Índice | Para qué |
|---|---|
| `ix_job_runs_job_name_target_date (job_name, target_date)` | El que pide el ticket: la consulta de idempotencia «¿hay un completed de este job para este día?» |
| `ux_job_runs_one_processing (job_name) WHERE status = 'processing'` | **El lock**: único y parcial, así que solo puede haber una fila `processing` por job |
| `ux_job_runs_one_completed_per_date (job_name, target_date) WHERE status = 'completed'` | La idempotencia también en la base: un solo `completed` por día, aunque el código fallara |

Los `check` impiden filas incoherentes. Por ejemplo, un `failed` sin mensaje de error o un
`completed` sin hora de fin no se pueden guardar.

**Dónde vive.** En `public`, junto a `telemetry_events`, con RLS activado como el resto de tablas
(la API REST pública de Supabase no puede leerla). La crea el propio script al arrancar
(`ensure_job_runs_table`, idempotente) y también se puede pegar el `.sql` en el SQL Editor de
Supabase. Usa su propio `MetaData`, así que el arranque de la API (`create_db_and_tables`) no la
toca: es del job, no de la API.

**Por qué el SQL y el modelo de SQLAlchemy por separado.** Es el mismo patrón que el esquema
`reporting` del hito 19. El `.sql` es la fuente de verdad en PostgreSQL. La `Table` de
`schema.py` la recrea en SQLite para los tests, con los mismos checks e índices. SQLite también
admite índices únicos parciales, así que el lock se prueba de verdad y no con un mock.

---

## 5. Fase 2 — `services/job_runner`

### 5.1 Las funciones

| Función | Qué hace |
|---|---|
| `create_run` | Inserta la fila en `pending` |
| `mark_processing` | `pending → processing`; lanza `JobAlreadyRunning` si otro tiene el lock |
| `mark_completed` | `processing → completed` |
| `mark_failed` | `pending \| processing → failed`, con el mensaje de error |
| `has_processing_lock` | ¿hay alguna fila `processing` de este job (de cualquier día)? |
| `has_completed_for_date` | ¿hay una fila `completed` de este job **para este día**? |
| `claim_run` | `create_run` + `mark_processing` + segunda comprobación de idempotencia |
| `tracked_run` | Context manager: `claim_run` al entrar; `completed` o `failed` al salir |
| `fail_stale_runs` | Cierra como `failed` las filas abiertas por procesos muertos |
| `get_run`, `list_runs` | Consultas |

Cada transición es un `UPDATE ... WHERE id = ? AND status = <origen>`. Si la fila no estaba en el
estado de origen, no se toca nada y se lanza `InvalidTransition`. Por eso una fila `completed`
nunca puede volver a `failed`, ni una `pending` saltar directamente a `completed`. Cada escritura
va en su propia transacción: si el trabajo del job falla, el registro del fallo no se pierde con
él.

### 5.2 El lock es el estado `processing`

El ticket pide que el lock sea `processing`, sin tabla ni columna aparte. Hay una trampa: la
comprobación previa no basta por sí sola. Si dos instancias arrancan en el mismo milisegundo, las
dos pueden preguntar «¿hay alguna en processing?», recibir «no» y ponerse a trabajar.

La solución es que la propia escritura de `processing` sea el lock. El índice único parcial
`ux_job_runs_one_processing` hace que la base de datos rechace la segunda fila `processing` del
mismo job con un `IntegrityError`, que `mark_processing` traduce a `JobAlreadyRunning`:

```
instancia A                           instancia B
has_processing_lock → False           has_processing_lock → False
create_run → pending                  create_run → pending
UPDATE → processing   ✔               UPDATE → processing   ✘ IntegrityError (índice único)
...trabaja...                         borra su fila pending, log "cancelled", exit 0
```

`has_processing_lock` se mantiene como camino rápido y legible (es el caso normal: la ejecución
anterior sigue en marcha). El índice cubre la carrera.

### 5.3 Idempotencia por `target_date`

`has_completed_for_date(job_name, target_date)` mira el job **y el día**. Que el job terminara bien
ayer no dice nada sobre hoy: solo con `job_name` el job dejaría de ejecutarse para siempre después
de su primer éxito.

`claim_run` repite la comprobación **dentro de la transacción que toma el lock**. Así se cubre esta
secuencia: B comprueba «no está completed», A termina el mismo día, B comprueba «no hay lock» y
entra. Al repetirla dentro de la transacción, B ve el `completed` de A y aborta. Si aun así
hubiera un fallo de código, el índice `ux_job_runs_one_completed_per_date` impediría el segundo
`completed`.

Un día `failed` **no** cuenta como hecho: la siguiente ejecución sobre ese día lo reintenta.

### 5.4 Ningún registro zombi

`tracked_run` es un context manager con try/except/finally:

```python
run = TrackedRun(claim_run(...))      # pending → processing
closed = False
try:
    yield run                         # el trabajo del job
    mark_completed(...)               # processing → completed
    closed = True
except BaseException as error:        # también KeyboardInterrupt, SystemExit, SIGTERM convertida
    failure = error_message(error)
    raise                             # el error se propaga (al log y al código de salida)
finally:
    if not closed:
        _fail_safely(...)             # processing → failed, con 3 reintentos
```

- Captura `BaseException` y no solo `Exception`, para que también Ctrl+C y `docker stop` dejen la
  fila en `failed`.
- Si falla el propio `mark_completed` (la base se cae justo al final), la fila tampoco se queda en
  `processing`: el `finally` la cierra como `failed`.
- `_fail_safely` reintenta tres veces, porque si la base también está fallando, ese UPDATE es lo
  único que separa un fallo de un zombi.

Lo que ningún `finally` puede cubrir es un `kill -9`, un OOM o un corte de luz: el proceso muere
sin ejecutar nada más. Para eso está `fail_stale_runs`. Al empezar cada ejecución, cierra como
`failed` las filas `processing` de más de 2 horas (el timeout del pipeline es 45 minutos, así que
ningún proceso vivo llega a eso) y las `pending` de más de 10 minutos. El mensaje empieza por
`stale:`, para distinguirlas de los fallos normales.

---

## 6. Fase 3 — El script

### 6.1 Flujo

```
main()
├─ TARGET_DATE del entorno (o ayer UTC); valida que sea un día ya cerrado     → exit 2 si no
├─ log INFO  status=started
└─ run_nightly_export()
    ├─ ensure_job_runs_table                  (idempotente)
    ├─ fail_stale_runs                        log WARNING si cerró alguna
    ├─ has_completed_for_date ?               log INFO status=skipped   → exit 0
    ├─ has_processing_lock ?                  log INFO status=cancelled → exit 0
    └─ with tracked_run(...)                  pending → processing
        ├─ CSV existe ?  sí → no se toca      no → export_telemetry_csv (atómico)
        ├─ subprocess pipeline.py --week-start … --trigger scheduled --triggered-by nightly_export:<id>
        └─ salida normal → completed          log INFO status=completed → exit 0
           excepción     → failed             log ERROR status=failed (con traceback) → exit 1
```

### 6.2 El CSV de backup

- **Contenido:** las filas de `telemetry_events` con `timestamp` en `[día 00:00 UTC, día siguiente
  00:00 UTC)`, ordenadas por `timestamp` e `id`. Columnas: `id, event_type, timestamp, session_id,
  user_id, source, tags, created_at`. `tags` va como JSON con las claves ordenadas, y los
  timestamps en ISO 8601 UTC (`2026-11-18T08:00:00.000Z`).
- **Solo si no existe.** Si ya está, no se reescribe aunque se relance el día. Es un snapshot: un
  evento que llega tarde (después de la exportación) está en la base y lo procesa el pipeline,
  pero no se añade al CSV ya escrito.
- **Escritura atómica.** Se escribe en `.telemetry_YYYY-MM-DD.csv.tmp` y al final se renombra con
  `os.replace`. Si el proceso muere a mitad, no queda un CSV a medias que la siguiente ejecución
  daría por bueno («ya existe»), lo que rompería la idempotencia.
- **Un día sin eventos** produce un CSV con solo la cabecera. También es información: ese día no
  hubo telemetría.
- **Lectura por lotes** (`yield_per=1000`): no carga el día entero en memoria.
- **No se versiona.** Lleva `user_id` y `session_id`, así que está en `.gitignore`.

### 6.3 El pipeline como subproceso

```
python data/pipelines/pipeline.py --week-start <lunes> --lookback-weeks 1 \
       --trigger scheduled --triggered-by nightly_export:<id de job_runs>
```

- **Subproceso y no import.** El pipeline es otro proceso: si revienta (o Prefect se cuelga),
  el script sigue vivo para registrar el `failed`. Además, el script no carga pandas ni Prefect.
- **`--week-start`:** la última semana ISO cerrada el día siguiente a `target_date`. Con el día por
  defecto (ayer) es justo la semana que el pipeline elegiría solo. Con un `TARGET_DATE` arbitrario
  es la que habría procesado la ejecución de esa noche. Mismo día ⇒ mismos argumentos ⇒ mismo
  resultado.
- **`--trigger scheduled` y `--triggered-by`** son dos opciones nuevas de la CLI del pipeline
  (antes, toda corrida por CLI quedaba como `manual`). Son el enlace entre capas de [§3](#3-arquitectura-quién-escribe-qué).
- **Timeout de 45 minutos** (`NIGHTLY_EXPORT_PIPELINE_TIMEOUT_MINUTES`). Si se supera, se mata al
  hijo y la ejecución queda `failed`.
- **Código de salida ≠ 0 ⇒ `failed`**, con el final de su stderr en `error_message` (por ejemplo,
  `pipeline failed at stage 'extract': …`).
- Del JSON que imprime el pipeline al terminar se guardan en `details` el `run_id`, las semanas y
  las filas cargadas.

### 6.4 Logs

Cada línea lleva timestamp UTC, job, día objetivo y estado resultante:

```
2026-11-19T13:07:04.066Z INFO job=nightly_export target_date=2026-11-18 status=started inicio de nightly_export (…)
2026-11-19T13:07:04.108Z INFO job=nightly_export target_date=2026-11-18 status=processing ejecución 56b868d6-… iniciada (pid 1)
2026-11-19T13:07:04.121Z INFO job=nightly_export target_date=2026-11-18 status=processing exportadas 3 filas de telemetry_events a /e2e/raw/telemetry_2026-11-18.csv
2026-11-19T13:07:04.121Z INFO job=nightly_export target_date=2026-11-18 status=processing lanzando el pipeline: python /app/data/pipelines/pipeline.py --week-start 2026-11-09 …
2026-11-19T13:07:26.585Z INFO job=nightly_export target_date=2026-11-18 status=processing pipeline terminado (pipeline_run_id=94d0d21e-…)
2026-11-19T13:07:26.591Z INFO job=nightly_export target_date=2026-11-18 status=completed ejecución 56b868d6-… completada
```

| Evento | Nivel | `status` |
|---|---|---|
| Inicio | INFO | `started` |
| Pasos del trabajo | INFO | `processing` |
| Fin correcto | INFO | `completed` |
| Omisión por duplicado | INFO | `skipped` |
| Cancelación por lock | INFO | `cancelled` |
| Zombis cerrados | WARNING | `failed` |
| Excepción | ERROR (con traceback) | `failed` |

Van a la salida estándar (las recoge `docker logs`). Con `NIGHTLY_EXPORT_LOG_FILE`, también a un
archivo.

### 6.5 `TARGET_DATE` y la configuración

- `TARGET_DATE` vacío → ayer en UTC (`datetime.now(timezone.utc).date() - timedelta(days=1)`).
- `TARGET_DATE=2026-11-15` → ese día. Debe ser anterior a hoy (UTC): un día sin cerrar daría un CSV
  incompleto que nunca se reescribiría. Un formato inválido o un día futuro terminan con código 2
  sin tocar la base.
- **`TARGET_DATE` solo se lee del entorno del proceso, nunca del `.env`.** Si alguien lo dejara
  olvidado en `.env`, cada noche apuntaría al mismo día y se omitiría por duplicado, sin ningún
  error visible. El resto de variables sí se pueden poner en `.env`.

Códigos de salida: `0` completed, skipped o cancelled · `1` failed · `2` configuración inválida ·
`128 + n` terminado por la señal `n` (143 = SIGTERM).

---

## 7. Fase 4 — El disparador

### 7.1 La decisión: un contenedor scheduler dedicado

| Opción | Por qué sí / por qué no |
|---|---|
| `APScheduler`, `@repeat_every`, lifespan de FastAPI | **Prohibido por el ticket**: compartiría proceso con la API. Además, con varias réplicas de la API se ejecutaría una vez por réplica, y un `--reload` lo reiniciaría |
| `crontab` del sistema operativo | Válido, pero depende de la máquina: en Windows (el entorno de desarrollo) no existe, y en un servidor hay que instalarlo a mano y no queda versionado con el código |
| Deployment de Prefect (`.serve()`) | Necesita un proceso de Prefect siempre vivo; el job dependería de Prefect aunque su lógica no lo use |
| **Contenedor con supercronic** ✔ | Versionado en el repo, se levanta con `docker compose up` igual que el resto, aislado de la API y con la misma imagen de dependencias. Es la opción que el checklist recomienda para producción |

**supercronic** es un cron pensado para contenedores. Pasa las variables de entorno del contenedor
a los jobs (el `cron` clásico no lo hace), manda su salida a `docker logs` y reenvía `SIGTERM` al
job en `docker stop`, que el script convierte en `failed`.

### 7.2 La expresión cron: `30 2 * * *` (UTC)

Cada día a las 02:30 UTC. Por qué esa hora:

- El día anterior ya está cerrado y quedan 2,5 horas de margen para los eventos que llegan tarde
  (lotes reenviados del backoffice, reintentos de la API).
- Termina mucho antes de la corrida semanal de Prefect (lunes 06:00 UTC), así que las dos nunca
  compiten por el lock de `reporting.pipeline_runs`.
- Es de madrugada en Zaragoza (03:30 o 04:30 según el horario) y fuera de la hora punta en Los
  Ángeles (18:30 o 19:30 del día anterior).

El contenedor corre con `TZ=UTC`, así que la hora del cron y el «ayer» del script usan el mismo
reloj.

### 7.3 Piezas

- [docker/scheduler/Dockerfile](docker/scheduler/Dockerfile): `python:3.13-slim` + las mismas
  dependencias que el backend (`services/requirements.txt`, generado desde `uv.lock`) + supercronic
  `v0.2.49`, descargado con su SHA-1 verificado (el de la página de la release, para amd64 y arm64).
  El build falla si el crontab no se puede interpretar (`supercronic -test`).
- [docker/scheduler/crontab](docker/scheduler/crontab): la línea `30 2 * * * python
  /app/scripts/nightly_export.py`, con la explicación.
- Servicio `nightly-export` en `docker-compose.yml`: `restart: unless-stopped` y `init: true`. Usa
  bind mounts de `services/`, `scripts/` y `data/`, como el backend en desarrollo, así que los CSV
  quedan en `data/raw/` del host. `TINYDB_PATH` apunta a un archivo propio del contenedor: el
  pipeline importa `services/database.py`, que abre TinyDB al importarse, y así nunca toca el
  `db.json` del backend.

Sin `-overlapping`, supercronic tampoco lanza el job si el anterior sigue corriendo. Aun así, la
garantía real es el lock de `job_runs`, porque también cubre las ejecuciones manuales y las de
otras máquinas.

### 7.4 Si se prefiere el crontab del sistema

En un servidor Linux sin Docker, la línea equivalente es esta (la variable `CRON_TZ` la entienden
cronie y la mayoría de crons modernos):

```cron
CRON_TZ=UTC
30 2 * * * cd /srv/trackflow && .venv/bin/python scripts/nightly_export.py >> /var/log/trackflow/nightly_export.log 2>&1
```

---

## 8. Cuándo hice commit y por qué

La regla: **un commit por cada pieza que funciona por sí sola y tiene sus tests en verde**. Cada
commit deja la rama en un estado que se puede probar, revisar y, si hace falta, revertir sin
arrastrar nada más. Los commits siguen el orden de las dependencias: primero lo que no depende de
nada (la tabla) y al final lo que depende de todo (el disparador y la documentación).

| # | Commit | Momento | Por qué ahí |
|---|---|---|---|
| 1 | `e5227b7` feat(jobs): tabla job_runs con su migración SQL | Al pasar los 8 tests de esquema (checks, índices, unicidad parcial) | La tabla es el contrato con la base de datos: todo lo demás se apoya en ella. Aislarla permite revisar el DDL (lo más difícil de cambiar después, porque las migraciones se arrastran) sin código alrededor |
| 2 | `eeca8f4` feat(jobs): services/job_runner con la máquina de estados | Al pasar los 21 tests de transiciones, lock, idempotencia y zombis | Es la lógica que pide el ticket en `services/`, y se puede usar para cualquier job, no solo este. Ir separada del script deja ver que el lock y la idempotencia se prueban sin CSV ni pipeline de por medio |
| 3 | `5aa0e16` feat(scripts): job nocturno nightly_export | Al pasar los 26 tests del script (incluidas las dos instancias simultáneas en procesos reales) y la suite completa (1129 tests) | Es la primera vez que el ticket funciona de punta a punta por línea de comandos. Incluye el cambio en la CLI del pipeline (`--trigger`/`--triggered-by`), porque el script es su único usuario: separarlo dejaría un commit con una opción que nadie usa |
| 4 | `399da86` feat(infra): contenedor scheduler | Después de construir la imagen y verla disparar el job en una prueba contra PostgreSQL | El disparador es infraestructura: se puede cambiar (por ejemplo, a un crontab del sistema) sin tocar el script. En un commit propio, esa decisión se revisa o se revierte sola |
| 5 | `a32797f` fix(infra): crontab con LF | En cuanto vi el aviso de Git `LF will be replaced by CRLF` sobre el crontab | Es un bug distinto con su propia explicación (ver [§9](#9-problemas-que-aparecieron-y-cómo-se-resolvieron)). Mezclarlo con el commit 4 escondería por qué existe la línea de `.gitattributes` |
| 6 | docs: hito 21 | Al final, con todo verificado | La documentación cita los hashes de los commits anteriores y los resultados reales de las pruebas, así que solo se puede escribir cuando ya existen |

Lo que **no** hice: un commit por archivo, o un único commit gigante al final. El primero deja
commits intermedios rotos (un script que importa un módulo que aún no existe). El segundo
impide revisar o revertir una parte sin las demás.

---

## 9. Problemas que aparecieron y cómo se resolvieron

### 9.1 Acentos corruptos en los logs en Windows

Los tests que lanzan el script como proceso fallaban con `UnicodeDecodeError: 'utf-8' codec can't
decode byte 0xf3`. En Windows, cuando la salida estándar va a una tubería o a un archivo, Python
la codifica en cp1252, y la `ó` de «omisión» salía como el byte `0xf3`. En Linux no pasa, pero
cualquiera que redirija los logs a un archivo en Windows los tendría corruptos. Solución:
`sys.stdout.reconfigure(encoding="utf-8")` al configurar el logging. Lo mismo para el
subproceso del pipeline (`PYTHONIOENCODING=utf-8`), que imprime su resumen con
`ensure_ascii=False`.

### 9.2 El crontab con CRLF

Este repo tiene `core.autocrlf=true`. Al hacer commit del crontab, Git avisó de que lo convertiría
a CRLF en el próximo checkout de Windows. Si eso pasa, la imagen se construye con
`nightly_export.py\r` y supercronic intenta ejecutar un archivo que no existe. Solución: una
línea en `.gitattributes` (`docker/scheduler/crontab text eol=lf`), lo mismo que ya se hacía con
los `*.sh`.

### 9.3 El Supabase del `.env` no responde

Al ejecutar el script contra la base de desarrollo, la conexión falló con `FATAL: (ENOTFOUND)
tenant/user postgres.<ref> not found`: el proyecto de Supabase está pausado o eliminado. El script
hizo lo correcto: log `ERROR` con el traceback, código 1 y ninguna fila escrita, porque no llegó
a conectar. Para validar contra PostgreSQL de verdad (los índices parciales, `gen_random_uuid`, RLS)
monté un PostgreSQL 17 en Docker con el esquema real de la API (`create_db_and_tables`, incluido
el trigger de inmutabilidad de `telemetry_events`) y repetí ahí todas las pruebas de [§10.2](#102-prueba-end-to-end-contra-postgresql).

### 9.4 `TARGET_DATE` en el `.env`

En el primer borrador `TARGET_DATE` salía en `.env.example` como variable vacía. Si alguien lo
copiaba a `.env` y le ponía un valor para una prueba, el job nocturno se quedaba en ese día para
siempre: cada noche haría «omisión por duplicado» sin ningún error. Ahora el script lee
`TARGET_DATE` antes de cargar el `.env`, así que solo cuenta si viene del entorno del proceso. En
`.env.example` queda documentado por qué no está.

### 9.5 Una carrera entre «comprobar» y «tomar el lock»

Ver [§5.2](#52-el-lock-es-el-estado-processing) y [§5.3](#53-idempotencia-por-target_date). Con las
consultas `has_processing_lock` y `has_completed_for_date` solas, dos instancias simultáneas
podían pasar las dos. Se resolvió con los dos índices únicos parciales y con la segunda
comprobación dentro de `claim_run`. El test `test_losing_the_race_for_the_lock_also_cancels`
fuerza esa carrera.

---

## 10. Cómo se comprobó

### 10.1 Tests automáticos

```
uv run pytest tests/jobs -q          # 55 passed
uv run pytest -q                     # 1129 passed (toda la suite, incluido el nuevo test de la CLI)
```

| Archivo | Qué prueba |
|---|---|
| `tests/jobs/test_job_runs_schema.py` (8) | Columnas, índice `(job_name, target_date)`, checks, un solo `processing` por job, un solo `completed` por día, migración SQL |
| `tests/jobs/test_job_runner.py` (21) | Cada transición, transiciones prohibidas, lock, idempotencia por día, `tracked_run` ante excepciones, `KeyboardInterrupt`, `SystemExit` y fallos al cerrar, zombis |
| `tests/jobs/test_nightly_export.py` (26) | `TARGET_DATE`, CSV (rango de fechas, columnas, orden, día vacío, no sobrescribir, sin CSV a medias), comando del pipeline, idempotencia (2 ejecuciones = 1, con `job_runs` y el CSV byte a byte iguales), lock, fallos del pipeline y del export, SIGTERM, zombis y, como procesos reales: CLI, logs con formato, **dos instancias simultáneas**, código 1 ante fallo, código 2 ante configuración inválida, que el script no importa FastAPI ni `services.api` |
| `tests/reporting/test_cli.py` (+1) | `--trigger scheduled --triggered-by` llega a `reporting.pipeline_runs` |

Todos usan SQLite (en memoria o en archivo) y nunca tocan el Supabase del `.env`.

### 10.2 Prueba end-to-end contra PostgreSQL

Con PostgreSQL 17 en Docker, el esquema real de la API y siete eventos sembrados (uno el día 17,
tres el día 18 y uno el 19, entre otros), ejecutando el script dentro de la imagen del scheduler
con **el pipeline real** como subproceso:

1. **Primera ejecución** (`TARGET_DATE=2026-11-18`): `completed` en 25 s. CSV con exactamente los
   3 eventos del día 18. `job_runs` con la fila `completed` y `details.pipeline_run_id`.
   `reporting.pipeline_runs` con `trigger = scheduled` y `triggered_by =
   nightly_export:<id de job_runs>`.
2. **Segunda ejecución, mismo día:** `status=skipped omisión por duplicado`, sin fila nueva y sin
   pipeline.
3. **Índices en PostgreSQL:** `pg_indexes` muestra los parciales `WHERE (status =
   'processing'::text)` y `WHERE (status = 'completed'::text)`, y RLS está activado.
4. **Dos contenedores a la vez** (`TARGET_DATE=2026-11-17`): uno `completed`, el otro `status=cancelled
   otra ejecución de nightly_export está en processing` nada más arrancar (40 ms). Los dos con
   código 0 y una sola fila en `job_runs`.
5. **`docker stop` en mitad del pipeline** (`TARGET_DATE=2026-11-16`): código 143, log `ERROR …
   status=failed … TerminatedBySignal: terminado por la señal SIGTERM` y la fila en `failed` con
   ese mensaje y `finished_at`. Ninguna en `processing`.
6. **supercronic disparando** (crontab de prueba `* * * * *`): en el minuto 1 reintentó el día 16
   (que había quedado `failed`), vio que el CSV ya existía, no lo reescribió, lanzó el pipeline y
   terminó `completed`. En el minuto 2 hizo `skipped`.

Estado final de `job_runs` tras las seis pruebas:

```
 target_date |  status   |                   error_message
-------------+-----------+----------------------------------------------------
 2026-11-18  | completed |
 2026-11-17  | completed |
 2026-11-16  | failed    | TerminatedBySignal: terminado por la señal SIGTERM
 2026-11-16  | completed |
```

---

## 11. Cómo arrancarlo y probarlo

```bash
# Local, desde la raíz del repo (usa DATABASE_URL del .env)
uv run python scripts/nightly_export.py                         # ayer en UTC
TARGET_DATE=2026-11-15 uv run python scripts/nightly_export.py  # otro día

# Docker: el scheduler arranca con el resto
docker compose up -d nightly-export
docker compose logs -f nightly-export
docker compose run --rm nightly-export python scripts/nightly_export.py
docker compose run --rm -e TARGET_DATE=2026-11-15 nightly-export python scripts/nightly_export.py

# Demostrar el lock: dos instancias a la vez (una completed, otra cancelled)
docker compose run --rm -d -e TARGET_DATE=2026-11-15 nightly-export python scripts/nightly_export.py
docker compose run --rm    -e TARGET_DATE=2026-11-15 nightly-export python scripts/nightly_export.py
```

En PowerShell, `TARGET_DATE` se pone con `$env:TARGET_DATE = "2026-11-15"` antes del comando (y
`Remove-Item Env:TARGET_DATE` después).

Ver qué pasó:

```sql
select target_date, status, started_at, finished_at, error_message, details
from job_runs where job_name = 'nightly_export' order by created_at desc limit 10;
```

---

## 12. Decisiones discutibles (y cómo defenderlas)

**«Las ejecuciones omitidas o canceladas no dejan fila en `job_runs`.»** El ticket dice que el
script «registra» la omisión y la cancelación, y lo hace en el log (INFO, con su estado). No las
guardo como filas por dos motivos. Primero, el ticket fija cuatro estados, y una ejecución que no
hizo nada no es `completed` (mentiría sobre el día si estaba cancelada) ni `failed` (dispararía
alertas falsas). Segundo, la idempotencia pide que dos ejecuciones dejen todo igual que una: si la
segunda añadiera una fila, `job_runs` sería distinta. Por eso, cuando una instancia pierde la
carrera por el lock, borra su fila `pending`: no llegó a ser una ejecución.

**«El estado `pending` dura milisegundos.»** Es verdad: se escribe en una transacción y pasa a
`processing` en la siguiente. Se escribe por separado a propósito, porque así la máquina de estados
es real (la fila existe en la base antes de tener el lock) y una muerte entre los dos pasos deja un
`pending` visible, que `fail_stale_runs` cierra.

**«El índice único parcial es un mecanismo de lock aparte.»** No es una tabla ni una columna nueva:
es una restricción sobre la misma columna `status`. Sin él, «processing como lock» solo funciona
si las dos instancias no arrancan a la vez, que es justo el caso que hay que cubrir.

**«El pipeline recalcula una semana cada noche, no un día.»** El pipeline produce un reporte semanal
y es idempotente (UPSERT por almacén, cliente y semana). Lanzarlo cada noche sobre la última semana
cerrada, con una de margen y las llegadas tardías de su marca de agua, deja el reporte al día sin
tocar su diseño. Calcular semanas abiertas mostraría números parciales en el dashboard de Thomas y
Ana.

**«Un `kill -9` deja la fila en `processing` hasta la siguiente ejecución.»** Un `finally` no puede
ejecutarse en un proceso muerto. `fail_stale_runs` la cierra al empezar la siguiente ejecución, y el
umbral de 2 horas está por encima del timeout del pipeline (45 minutos), así que nunca cierra una
ejecución viva. Hasta entonces, la fila no bloquea nada, porque nada más intenta correr.

---

## 13. Lo que queda pendiente

- **Restaurar el Supabase de desarrollo.** El proyecto del `.env` no existe o está pausado
  (§9.3). Cuando vuelva, la primera ejecución creará `job_runs` sola; también se puede aplicar antes
  `services/job_runner/sql/001_job_runs.sql` desde el SQL Editor.
- **Repesca automática de días perdidos.** Si el job falla una noche, ese día queda `failed` y la
  noche siguiente procesa el siguiente día. Se repesca a mano con `TARGET_DATE`. Una mejora sería que
  el script reintentara también los `failed` de los últimos N días.
- **Alertas.** Un `failed` queda en la base y en los logs, pero nadie recibe un aviso. Lo natural
  sería una alerta sobre los logs `ERROR … job=nightly_export` o una consulta periódica a `job_runs`.
- **Una corrida del pipeline matada a mitad.** Si `docker stop` mata al pipeline después de que
  registre su corrida, esa fila queda `running` en `reporting.pipeline_runs` hasta que la marque
  `crashed` su propia detección de corridas colgadas (1 hora, hito 19). Es responsabilidad de esa
  capa, pero conviene saberlo.
- **Imagen de producción.** El servicio de compose monta el código por bind mount, como el backend
  en desarrollo. Para producción, la imagen del scheduler debería copiar `services/`, `scripts/` y
  `data/pipelines/`.
- **Retención de los CSV.** `data/raw/` crecerá un archivo al día. Falta decidir cuánto se guardan
  y si se suben a un almacenamiento de objetos.

---

## 14. Cuerpo del PR

> Listo para pegar en el PR de `feature/nightly-telemetry-export` → `main`.

```markdown
## Ticket #DEV-53 — Script nocturno de telemetría

`scripts/nightly_export.py` exporta los `telemetry_events` del día anterior (UTC) a
`data/raw/telemetry_YYYY-MM-DD.csv` si no existe (backup; el pipeline sigue leyendo de la BD),
lanza `data/pipelines/pipeline.py` como subproceso y registra cada ejecución en `job_runs`
(`pending → processing → completed | failed`) mediante `services/job_runner`.

### Disparador: contenedor scheduler dedicado (supercronic)

**Expresión cron:** `30 2 * * *`, en UTC (el contenedor corre con `TZ=UTC`), en
`docker/scheduler/crontab`.

**Por qué un contenedor y no el scheduler de FastAPI ni el crontab del SO:**
- APScheduler / `@repeat_every` / lifespan comparten proceso con la API: lo prohíbe el ticket, se
  ejecutaría una vez por réplica y un `--reload` lo reiniciaría.
- El crontab del SO no está versionado con el código y no existe en Windows (desarrollo).
- El contenedor `nightly-export` se levanta con `docker compose up`, usa la misma imagen de
  dependencias que el backend y no comparte proceso ni hilo con FastAPI. supercronic pasa las
  variables de entorno a los jobs, manda la salida a `docker logs` y reenvía SIGTERM, que el script
  convierte en `failed`.

**Por qué a las 02:30 UTC:** el día anterior está cerrado y quedan 2,5 h para eventos que llegan
tarde. Termina mucho antes de la corrida semanal de Prefect (lunes 06:00 UTC), así que no compiten
por el lock de `reporting.pipeline_runs`. Es de madrugada en Zaragoza y fuera de la hora punta en
Los Ángeles.

### Garantías
- **Lock vía `processing`:** índice único parcial `(job_name) WHERE status = 'processing'`. Una
  segunda instancia termina con código 0 y un log `status=cancelled`.
- **Idempotencia por `target_date`:** si `(nightly_export, target_date)` ya está `completed`, no se
  exporta ni se relanza nada (`status=skipped`). Además, un índice único parcial impide un segundo
  `completed` por día.
- **Sin zombis:** `tracked_run` (try/except/finally sobre `BaseException`) cierra siempre la fila;
  `fail_stale_runs` recoge las de procesos muertos por `kill -9`.
- **`job_runs` ≠ `pipeline_runs`:** el script escribe `job_runs`; el pipeline, `pipeline_runs`. Se
  enlazan con `--triggered-by nightly_export:<id>` y `details.pipeline_run_id`.
- **`TARGET_DATE=YYYY-MM-DD`** cambia el día objetivo sin tocar código (solo desde el entorno del
  proceso, nunca desde `.env`).

### Pruebas
- `uv run pytest -q`: 1129 passed (55 nuevos en `tests/jobs/`, +1 en `tests/reporting/test_cli.py`).
- End-to-end en PostgreSQL 17 (Docker) con el pipeline real: ejecución completa, segunda ejecución
  omitida, dos contenedores simultáneos (uno `cancelled`), `docker stop` → `failed`, y supercronic
  disparando y reintentando un día `failed`.

Detalle completo en `hito_21.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## 15. Archivos creados y modificados

| Archivo | Cambio |
|---|---|
| `services/job_runner/__init__.py` | Nuevo: API pública del módulo |
| `services/job_runner/schema.py` | Nuevo: tabla `job_runs` (SQLAlchemy) y `ensure_job_runs_table` |
| `services/job_runner/sql/001_job_runs.sql` | Nuevo: migración PostgreSQL |
| `services/job_runner/db.py` | Nuevo: conexión sin pasar por la API |
| `services/job_runner/runs.py` | Nuevo: máquina de estados, lock, idempotencia, zombis |
| `scripts/nightly_export.py` | Nuevo: el script |
| `data/pipelines/pipeline.py` | CLI: `--trigger {manual,scheduled}` y `--triggered-by` |
| `docker/scheduler/Dockerfile` | Nuevo: imagen del scheduler con supercronic |
| `docker/scheduler/crontab` | Nuevo: `30 2 * * *` |
| `docker-compose.yml` | Servicio `nightly-export` |
| `.gitattributes` | El crontab siempre con LF |
| `.gitignore` | `data/raw/telemetry_*.csv` y sus `.tmp` |
| `.env.example` | Variables `JOB_RUNS_DATABASE_URL` y `NIGHTLY_EXPORT_*`; por qué `TARGET_DATE` no va ahí |
| `tests/jobs/` | Nuevo: `conftest.py` y tres archivos de tests (55 tests) |
| `tests/reporting/test_cli.py` | +1 test de `--trigger`/`--triggered-by` |
| `scripts/README*.md`, `data/raw/README*.md` | Documentan el script y el CSV |

---

## 16. Checklist de evaluación

- [x] El script es un proceso independiente: no importa FastAPI ni `services.api`
  (`test_the_script_does_not_import_fastapi_or_the_api`) y corre en su propio contenedor.
- [x] Máquina de estados `pending → processing → completed | failed`, con `target_date` en cada fila
  (§5.1, `test_job_runner.py`).
- [x] `processing` como lock, sin mecanismo aparte, demostrado con dos instancias a la vez (test con
  procesos reales y prueba con dos contenedores sobre PostgreSQL, §10.2).
- [x] Idempotente por `target_date`: dos ejecuciones = una (mismo CSV byte a byte, misma tabla, una
  sola llamada al pipeline).
- [x] Ningún registro en `processing` tras un fallo: try/except/finally en `tracked_run`, también
  ante SIGTERM (§10.2, paso 5).
- [x] CSV en `data/raw/telemetry_YYYY-MM-DD.csv` con los eventos de `telemetry_events` del día (solo
  backup).
- [x] `job_runs` y `pipeline_runs` coexisten sin duplicar responsabilidades (§3).
- [x] Logs con timestamp, job y estado en cada evento (§6.4, test con expresión regular sobre cada
  línea).
- [x] Disparador configurado (contenedor `nightly-export`) y expresión cron documentada en el PR
  (§14).
- [x] `TARGET_DATE` permite fechas arbitrarias sin tocar código.

---

## 17. Glosario

- **cron / crontab:** programador de tareas de Unix y el archivo con sus líneas (`minuto hora
  día-del-mes mes día-de-la-semana comando`).
- **supercronic:** implementación de cron pensada para contenedores.
- **Índice único parcial:** índice `UNIQUE` que solo se aplica a las filas que cumplen un `WHERE`.
  Aquí, a las `processing` (el lock) y a las `completed` (la idempotencia).
- **Idempotente:** que repetirlo no cambia el resultado.
- **Zombi / stale:** fila abierta de un proceso que ya no existe.
- **SIGTERM:** la señal que envían `docker stop` o `kill` para pedir a un proceso que termine; si no
  termina, después llega `SIGKILL`, que no se puede capturar.
- **Escritura atómica:** escribir en un archivo temporal y renombrarlo, para que el archivo final
  esté completo o no exista.
- **UTC:** tiempo universal coordinado; la referencia de «ayer» y de la hora del cron.
