# Procesos en Segundo Plano

## 🎯 Tu reto

> 📌 **Estás construyendo sobre tu copia del monorepo** de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

Tu empresa tiene un pipeline de datos y una API con telemetría instrumentada. El problema es que alguien tiene que ejecutar el pipeline cada noche. Tu tech lead ha registrado el siguiente ticket:

---

### Ticket #DEV-53 — Script nocturno de telemetría

Necesitamos un script que se ejecute cada noche de forma automática, sin intervención manual. El script debe exportar los datos de telemetría del día anterior a CSV (si aún no se ha hecho), lanzar el pipeline de datos, y dejar constancia en base de datos de qué pasó y cuándo.

#### Criterios de aceptación:
- **El script es un proceso completamente independiente de la API** — no puede bloquear ningún endpoint ni ejecutarse en el mismo hilo de FastAPI.
- **Si el script ya está corriendo cuando el siguiente ciclo lo dispara, la segunda instancia debe abortar silenciosamente.** No dos ejecuciones en paralelo.
- **Si el script falla, el estado de ese registro en base de datos debe quedar en `failed`, no en `processing`.** Ningún registro puede quedarse zombi.
- **El script debe ser idempotente:** si se ejecuta dos veces sobre el mismo día, el resultado debe ser el mismo que si se hubiera ejecutado una sola vez.
- **Cada ejecución queda registrada con timestamp, estado (`pending` → `processing` → `completed` | `failed`) y, en caso de error, el mensaje de la excepción.**

Pon el script en `scripts/` y la lógica de estado en `services/`. El disparador queda en crontab o en el scheduler del framework — la decisión es tuya, justifícala en el PR.

---

## 📖 Conocimiento complementario — Ciclo de vida de una tarea en segundo plano

Antes de escribir una línea de código, hay un concepto arquitectónico que debes interiorizar: **en procesamiento en segundo plano, un dato no existe solo como "dato" — existe como un estado.**

La máquina de estados canónica para este tipo de tarea es:

```text
pending -> processing -> completed
       \-> failed
```

Cada transición importa:

- `pending` — la tarea está esperando ser ejecutada. Se crea el registro antes de empezar.
- `processing` — se actualiza al inicio de la ejecución, antes de hacer ningún trabajo. Esto es lo que impide que otro proceso tome la misma tarea.
- `completed` — se actualiza solo si todo terminó bien.
- `failed` — se actualiza si se captura cualquier excepción. Nunca debe quedarse en `processing`.

El **distributed lock es el estado `processing` mismo** — no una tabla, columna o flag aparte. Al iniciar, el script pasa un registro de `job_runs` a `processing`. Si otra instancia encuentra una fila `processing` para `nightly_export`, aborta silenciosamente. Al terminar —bien o mal— el registro pasa a `completed` o `failed`, lo que libera el lock. No implementes un segundo mecanismo de bloqueo.

Un script que implementa esta máquina de estados puede fallar, reiniciarse o ejecutarse fuera de horario y siempre dejará el sistema en un estado conocido y recuperable.

---

## 📖 Conocimiento complementario — Cómo encaja en el monorepo

`job_runs` ≠ `pipeline_runs` — no son duplicados:

| Tabla | Capa | Qué registra |
| :--- | :--- | :--- |
| `job_runs` | Orquestación nocturna (este proyecto) | Export CSV, trigger del subprocess del pipeline, lock e idempotencia del script |
| `pipeline_runs` | ETL interno (Hito 6) | Fases extract/transform/load, watermark, filas procesadas |

El script nocturno escribe en `job_runs`. El subprocess del pipeline escribe en `pipeline_runs` durante su propia ejecución.

**El CSV es backup, no input del pipeline.** El script exporta `telemetry_events` desde la base de datos a `data/raw/telemetry_YYYY-MM-DD.csv` para auditoría y recuperación. El pipeline que construiste en el Hito 6 lee desde `telemetry_events` en BD (vía SQL/watermark) — **no** lee el archivo CSV. No conectes el pipeline para consumir el archivo de exportación.

### Convenciones de fecha y subprocess:

- **"Ayer"** = día calendario anterior en **UTC** (`datetime.now(timezone.utc).date() - timedelta(days=1)`).
- `TARGET_DATE=YYYY-MM-DD` sobrescribe la fecha objetivo para pruebas sin cambiar código.
- **Subprocess del pipeline** (referencia — ajusta al entry point de tu Hito 6 si difiere):
  ```bash
  python -m data.pipelines.telemetry_kpi_daily.run --no-prefect
  ```

---

## 🌱 Cómo Empezar el Proyecto

1. Revisa tu monorepo: identifica las tablas de telemetría existentes y las convenciones de nomenclatura que ya has usado para rutas y campos.
2. Crea la tabla de control de ejecuciones en base de datos (puedes añadirla al schema existente o crear una migración nueva).
3. Implementa el script en `scripts/nightly_export.py` y el servicio de control de estado en `services/`.
4. Configura el disparador en crontab o en el scheduler de tu framework y documenta la expresión cron en el PR.

---

## 💻 Qué Debes Hacer

### Modelo de datos
- [ ] Crear una tabla `job_runs` con al menos los campos: `id`, `job_name`, `target_date` (fecha — obligatorio para idempotencia por día), `status` (`pending` | `processing` | `completed` | `failed`), `started_at`, `finished_at`, `error_message`, `created_at`.
- [ ] Añadir un índice en `(job_name, target_date)` para consultas de idempotencia eficientes.
- [ ] Añadir la migración o instrucción SQL necesaria para crear la tabla en el esquema del monorepo.
- [ ] No fusionar `job_runs` con `pipeline_runs` del Hito 6 — capas distintas (ver nota de arquitectura arriba).

### Script principal (`scripts/nightly_export.py`)
- [ ] Resolver `target_date` desde env `TARGET_DATE` o por defecto **ayer en UTC**.
- [ ] El script exporta filas de `telemetry_events` para `target_date` a un CSV en `data/raw/` (p. ej. `telemetry_2025-01-15.csv`), solo si el archivo no existe. El CSV es snapshot de backup/auditoría — el pipeline lee desde BD, no este archivo.
- [ ] El script lanza el pipeline de datos como subproceso tras la exportación (comando de referencia: `python -m data.pipelines.telemetry_kpi_daily.run --no-prefect`, o tu entry point CLI del Hito 6).
- [ ] El script escribe en `job_runs` el resultado (estado final + `target_date` + timestamp + error si lo hay).
- [ ] El script es ejecutable desde línea de comandos: `python scripts/nightly_export.py`.

### Idempotencia y bloqueo
- [ ] **Lock vía `processing`:** si ya existe un registro `job_runs` con `status = 'processing'` para `nightly_export`, el script aborta silenciosamente y registra la cancelación. Sin tabla o columna lock aparte.
- [ ] **Idempotencia vía `target_date`:** si ya existe un registro `completed` para `(job_name='nightly_export', target_date)`, el script no vuelve a exportar el CSV ni relanza el pipeline. Registra omisión por duplicado. Solo `job_name` sin `target_date` no basta.

### Control de estado (`services/`)
- [ ] Implementar módulo `job_runner` en `services/` con funciones para crear, actualizar y consultar `job_runs` (incl. `has_processing_lock` y `has_completed_for_date`).
- [ ] Cualquier excepción no controlada debe capturarse, actualizar el estado a `failed` con el mensaje de error, y propagar el error al log.
- [ ] Ningún registro puede quedar en estado `processing` tras una ejecución fallida.

### Disparador
- [ ] Configurar el cronjob con `crontab` del SO o un **contenedor scheduler dedicado** — recomendado en producción.
- [ ] **No ejecutar el script nocturno dentro del proceso FastAPI** (sin `APScheduler`, `@repeat_every` ni hooks lifespan en el servidor API). Un worker separado solo es aceptable si no comparte el hilo principal de la API.
- [ ] Documentar la expresión cron y la decisión de implementación en el cuerpo del PR.
- [ ] Añadir variable de entorno `TARGET_DATE` opcional (`YYYY-MM-DD`) para sobrescribir la fecha objetivo en pruebas sin modificar código.

### Observabilidad
- [ ] Generar logs de ejecución con nivel `INFO` para los eventos normales (inicio, fin, omisión por duplicado) y `ERROR` para excepciones.
- [ ] Cada línea de log incluye timestamp, nombre del job y estado resultante.

---

## ✅ Qué Evaluaremos

- [ ] **El script es un proceso independiente:** no importa ni ejecuta código de FastAPI en el hilo principal de la aplicación.
- [ ] **La máquina de estados `pending` → `processing` → `completed` | `failed` está implementada** y los registros en `job_runs` reflejan el estado real de cada ejecución, incluyendo `target_date`.
- [ ] **El estado `processing` actúa como distributed lock (sin mecanismo lock aparte):** demostrable lanzando dos instancias del script al mismo tiempo.
- [ ] **El script es idempotente por `target_date`:** ejecutarlo dos veces el mismo día produce el mismo resultado que una vez, sin duplicar CSV ni ejecuciones del pipeline.
- [ ] **Ningún registro queda en estado `processing` tras un fallo:** el bloque `try/except/finally` garantiza la transición a `failed`.
- [ ] **El CSV existe en `data/raw/` con nombre correcto y datos exportados desde `telemetry_events`** para la fecha objetivo (solo backup — el pipeline lee desde BD).
- [ ] **`job_runs` y `pipeline_runs` coexisten** sin duplicar responsabilidades.
- [ ] **Los logs incluyen timestamp, nombre del job y estado** en cada evento relevante.
- [ ] **El disparador está configurado y la expresión cron documentada en el PR.**
- [ ] **`TARGET_DATE` permite ejecutar el script sobre fechas arbitrarias** sin modificar el código.

---

## 📦 Cómo Entregar

1. Asegúrate de que todos los ítems del checklist estén completados.
2. Haz push de tu rama al repositorio.
3. Abre un **Pull Request** desde tu rama hacia `main`.
4. En el cuerpo del PR incluye:
   - La expresión cron configurada y el método elegido (crontab vs. scheduler de framework), con una breve justificación.
   - Un ejemplo del log de una ejecución exitosa y uno de una ejecución fallida o bloqueada.
   - Captura o fragmento del CSV generado (primeras filas).
5. Añade la etiqueta `cronjob` al PR antes de enviarlo a revisión.



