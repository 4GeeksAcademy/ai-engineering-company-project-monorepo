"""Job nocturno de telemetría (hito 21, ticket #DEV-53).

Cada noche, para el día anterior (`target_date`):

1. Exporta las filas de `telemetry_events` de ese día a `data/raw/telemetry_YYYY-MM-DD.csv`,
   **solo si el archivo no existe**. El CSV es una copia de auditoría y recuperación: el pipeline
   no lo lee.
2. Lanza el pipeline de datos como **subproceso** (`data/pipelines/pipeline.py`). El pipeline lee
   `telemetry_events` desde la base de datos (marca de agua) y escribe su propia corrida en
   `reporting.pipeline_runs`.
3. Deja constancia en `job_runs` (services/job_runner): pending → processing → completed | failed,
   con `target_date`, timestamps y, si falla, el mensaje de la excepción.

Garantías:

- **Proceso independiente de la API**: no importa FastAPI ni `services.api`; lo lanza cron (el
  contenedor `nightly-export` de docker-compose.yml), nunca el servidor.
- **Una sola ejecución a la vez**: si otra está en `processing`, esta instancia termina sin hacer
  nada (código 0, log `cancelled`). El estado `processing` es el lock (índice único parcial).
- **Idempotente por día**: si `(nightly_export, target_date)` ya está `completed`, no se exporta
  ni se relanza nada (código 0, log `skipped`). Dos ejecuciones = una ejecución.
- **Sin zombis**: cualquier excepción (también Ctrl+C o SIGTERM) deja la fila en `failed`; las que
  deja un `kill -9` se cierran como `failed` (stale) al empezar la siguiente ejecución.

Uso (desde la raíz del repo):

    python scripts/nightly_export.py                       # ayer en UTC
    TARGET_DATE=2026-11-15 python scripts/nightly_export.py  # otro día, sin tocar código

Variables de entorno (todas opcionales salvo la base de datos; las demás también desde .env):

    TARGET_DATE                       día a procesar (YYYY-MM-DD); por defecto, ayer en UTC. Solo
                                      desde el entorno del proceso, nunca desde .env
    JOB_RUNS_DATABASE_URL             base de job_runs y telemetry_events (por defecto DATABASE_URL)
    NIGHTLY_EXPORT_DIR                carpeta del CSV (por defecto data/raw)
    NIGHTLY_EXPORT_PIPELINE_TIMEOUT_MINUTES   timeout del subproceso del pipeline (45)
    NIGHTLY_EXPORT_STALE_AFTER_MINUTES        processing más antiguo que esto = proceso muerto (120)
    NIGHTLY_EXPORT_PIPELINE_CMD       sustituye el comando del pipeline (pruebas y demos), como
                                      lista JSON o como línea de shell
    NIGHTLY_EXPORT_LOG_FILE           además de la salida estándar, escribe el log en este archivo

Códigos de salida: 0 completed, skipped o cancelled · 1 failed · 2 configuración inválida ·
128 + n terminado por la señal n.
"""

import csv
import json
import logging
import os
import shlex
import signal
import socket
import subprocess
import sys
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

# Ejecutado como script, Python solo añade scripts/ al path: se añade la raíz del repo.
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from dotenv import load_dotenv  # noqa: E402
from sqlalchemy import select  # noqa: E402
from sqlalchemy.engine import Engine  # noqa: E402

from services import job_runner  # noqa: E402
from services.telemetry_models import TelemetryEventRecord  # noqa: E402

JOB_NAME = "nightly_export"

DEFAULT_EXPORT_DIR = REPO_ROOT / "data" / "raw"
PIPELINE_SCRIPT = REPO_ROOT / "data" / "pipelines" / "pipeline.py"
DEFAULT_PIPELINE_TIMEOUT = timedelta(minutes=45)
# Mayor que el timeout del pipeline más la exportación: una fila processing más antigua que esto
# no puede ser de un proceso vivo.
DEFAULT_STALE_AFTER = timedelta(minutes=120)

CSV_COLUMNS = ("id", "event_type", "timestamp", "session_id", "user_id", "source", "tags", "created_at")

COMPLETED, SKIPPED, CANCELLED = "completed", "skipped", "cancelled"
EXIT_OK, EXIT_FAILED, EXIT_CONFIG = 0, 1, 2

EVENTS = TelemetryEventRecord.__table__


class ConfigError(ValueError):
    """Una variable de entorno con un valor no válido."""


class PipelineFailed(RuntimeError):
    """El subproceso del pipeline terminó con error o superó su timeout."""


class TerminatedBySignal(BaseException):
    """El proceso recibió SIGTERM (p. ej. `docker stop`): se trata como un fallo de la ejecución."""

    def __init__(self, signum: int):
        super().__init__(f"terminado por la señal {signal.Signals(signum).name}")
        self.signum = signum


# =========================================================
# CONFIGURACIÓN
# =========================================================


def utc_today() -> date:
    return datetime.now(timezone.utc).date()


def resolve_target_date(value: str | None, today: date) -> date:
    """`TARGET_DATE` (YYYY-MM-DD) o, si no está, ayer en UTC. Tiene que ser un día ya cerrado."""
    if not (value or "").strip():
        return today - timedelta(days=1)
    try:
        target = date.fromisoformat(value.strip())
    except ValueError:
        raise ConfigError(f"TARGET_DATE debe tener el formato YYYY-MM-DD y vale '{value}'") from None
    if target >= today:
        raise ConfigError(f"TARGET_DATE={target} no es un día cerrado: tiene que ser anterior a hoy ({today}, UTC)")
    return target


def _minutes(name: str, default: timedelta) -> timedelta:
    value = os.getenv(name, "").strip()
    if not value:
        return default
    try:
        minutes = float(value)
    except ValueError:
        raise ConfigError(f"{name} debe ser un número de minutos y vale '{value}'") from None
    if minutes <= 0:
        raise ConfigError(f"{name} debe ser mayor que 0")
    return timedelta(minutes=minutes)


def export_dir() -> Path:
    value = os.getenv("NIGHTLY_EXPORT_DIR", "").strip()
    return Path(value) if value else DEFAULT_EXPORT_DIR


# =========================================================
# LOGS: timestamp UTC, job, target_date y estado en cada línea
# =========================================================

LOG_FORMAT = "%(asctime)s.%(msecs)03dZ %(levelname)s job=%(job)s target_date=%(target_date)s status=%(status)s %(message)s"


class JobContext(logging.Filter):
    """Rellena `job`, `target_date` y `status` en los registros que no los traen (otros loggers)."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.job = getattr(record, "job", JOB_NAME)
        record.target_date = getattr(record, "target_date", "-")
        record.status = getattr(record, "status", "-")
        return True


def configure_logging() -> None:
    formatter = logging.Formatter(LOG_FORMAT, datefmt="%Y-%m-%dT%H:%M:%S")
    formatter.converter = time.gmtime  # timestamps en UTC, como target_date
    # UTF-8 siempre: en Windows la salida estándar es cp1252 cuando va a un archivo o a una tubería.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    if log_file := os.getenv("NIGHTLY_EXPORT_LOG_FILE", "").strip():
        handlers.append(logging.FileHandler(log_file, encoding="utf-8"))
    root = logging.getLogger()
    for handler in handlers:
        handler.setFormatter(formatter)
        handler.addFilter(JobContext())
        root.addHandler(handler)
    root.setLevel(logging.INFO)


class JobLog:
    """Logger de una ejecución: cada línea lleva el job, el día y el estado resultante."""

    def __init__(self, target_date: date | None):
        self._logger = logging.getLogger(f"jobs.{JOB_NAME}")
        self._target_date = target_date.isoformat() if target_date else "-"

    def event(self, level: int, status: str, message: str, *args: Any, exc_info: bool = False) -> None:
        self._logger.log(level, message, *args, exc_info=exc_info,
                         extra={"job": JOB_NAME, "target_date": self._target_date, "status": status})


# =========================================================
# EXPORTACIÓN A CSV (backup, no input del pipeline)
# =========================================================


def csv_path(directory: Path, day: date) -> Path:
    return directory / f"telemetry_{day.isoformat()}.csv"


def day_bounds(day: date) -> tuple[datetime, datetime]:
    """Ventana semiabierta `[día 00:00 UTC, día siguiente 00:00 UTC)`."""
    start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    return start, start + timedelta(days=1)


def _iso(moment: datetime | None) -> str:
    if moment is None:
        return ""
    if moment.tzinfo is None:  # SQLite devuelve datetimes sin zona: se guardaron en UTC
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _csv_row(row) -> list[str]:
    tags = row.tags if isinstance(row.tags, str) else json.dumps(row.tags, ensure_ascii=False, sort_keys=True)
    return [str(row.id), row.event_type, _iso(row.timestamp), row.session_id or "", row.user_id or "",
            row.source, tags, _iso(row.created_at)]


def export_telemetry_csv(engine: Engine, day: date, path: Path) -> int:
    """Escribe las filas de `telemetry_events` con `timestamp` en `day` (UTC) y devuelve cuántas.

    Se escribe en un `.tmp` y se renombra al final (operación atómica): si el proceso muere a
    mitad, no queda un CSV a medias que la siguiente ejecución daría por bueno («ya existe»).
    Un día sin eventos produce un CSV con solo la cabecera: también deja constancia.
    """
    start, end = day_bounds(day)
    query = (select(EVENTS).where(EVENTS.c.timestamp >= start, EVENTS.c.timestamp < end)
             .order_by(EVENTS.c.timestamp, EVENTS.c.id))
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    rows = 0
    try:
        with engine.connect() as connection, temporary.open("w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(CSV_COLUMNS)
            # yield_per: lee por lotes en lugar de cargar todo el día en memoria.
            for row in connection.execution_options(yield_per=1000).execute(query):
                writer.writerow(_csv_row(row))
                rows += 1
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)
    return rows


# =========================================================
# PIPELINE (subproceso)
# =========================================================


def pipeline_week_start(day: date) -> date:
    """La semana que recalcula el pipeline: la última semana ISO cerrada el día después de `day`.

    Con el `target_date` por defecto (ayer) es la que el pipeline elegiría solo. Con un
    TARGET_DATE arbitrario es la que habría procesado la ejecución de esa noche: mismo día ⇒
    mismos argumentos ⇒ mismo resultado.
    """
    next_day = day + timedelta(days=1)
    return next_day - timedelta(days=next_day.weekday()) - timedelta(days=7)


def pipeline_command(day: date, run_id: uuid.UUID) -> list[str]:
    override = os.getenv("NIGHTLY_EXPORT_PIPELINE_CMD", "").strip()
    if override:
        return json.loads(override) if override.startswith("[") else shlex.split(override)
    return [
        sys.executable, str(PIPELINE_SCRIPT),
        "--week-start", pipeline_week_start(day).isoformat(),
        "--lookback-weeks", "1",
        "--trigger", "scheduled",
        # Enlaza la corrida de reporting.pipeline_runs con esta fila de job_runs.
        "--triggered-by", f"{JOB_NAME}:{run_id}",
    ]


def _display(command: list[str]) -> str:
    shown = ["python" if part == sys.executable else part for part in command]
    return " ".join(shlex.quote(str(part)) for part in shown)


def _tail(text: str, limit: int = 1500) -> str:
    text = (text or "").strip()
    return text if len(text) <= limit else "…" + text[-limit:]


def _pipeline_summary(stdout: str) -> dict[str, Any]:
    """El resumen JSON que imprime `pipeline.py` al terminar (su último objeto en stdout)."""
    start = stdout.rfind("\n{")
    start = start + 1 if start >= 0 else stdout.find("{")
    if start < 0:
        return {}
    try:
        summary = json.loads(stdout[start:])
    except ValueError:
        return {}
    return summary if isinstance(summary, dict) else {}


def run_pipeline(command: list[str], timeout: timedelta) -> dict[str, Any]:
    """Ejecuta el pipeline como proceso hijo y devuelve lo que se guarda en `job_runs.details`.

    Si el job recibe SIGTERM o supera el timeout, `subprocess.run` mata al hijo antes de propagar.
    """
    environment = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}
    try:
        completed = subprocess.run(command, cwd=REPO_ROOT, env=environment, capture_output=True, text=True,
                                   encoding="utf-8", errors="replace", timeout=timeout.total_seconds())
    except subprocess.TimeoutExpired:
        raise PipelineFailed(f"el pipeline superó el timeout de {timeout}") from None
    if completed.returncode != 0:
        raise PipelineFailed(f"el pipeline terminó con código {completed.returncode}: "
                             f"{_tail(completed.stderr or completed.stdout)}")
    summary = _pipeline_summary(completed.stdout)
    return {
        "pipeline_returncode": completed.returncode,
        "pipeline_run_id": summary.get("run_id"),
        "pipeline_weeks_processed": summary.get("weeks_processed"),
        "pipeline_rows_upserted": summary.get("rows_upserted"),
    }


# =========================================================
# JOB
# =========================================================


def run_nightly_export(
    engine: Engine,
    target_date: date,
    *,
    directory: Path,
    pipeline_timeout: timedelta = DEFAULT_PIPELINE_TIMEOUT,
    stale_after: timedelta = DEFAULT_STALE_AFTER,
    pipeline_runner: Callable[[list[str], timedelta], dict[str, Any]] = run_pipeline,
) -> str:
    """Una ejecución del job. Devuelve `completed`, `skipped` o `cancelled`; si falla, la fila queda
    `failed`, se registra en el log con su traceback y la excepción se propaga."""
    log = JobLog(target_date)
    run_id: uuid.UUID | None = None
    try:
        job_runner.ensure_job_runs_table(engine)

        stale = job_runner.fail_stale_runs(engine, JOB_NAME, processing_older_than=stale_after)
        if stale:
            log.event(logging.WARNING, "failed", "%d ejecución(es) abandonadas por un proceso muerto marcadas "
                      "como failed (stale)", stale)

        # Idempotencia por día: lo primero, para que un día ya hecho nunca toque el CSV ni el pipeline.
        if job_runner.has_completed_for_date(engine, JOB_NAME, target_date):
            log.event(logging.INFO, SKIPPED, "omisión por duplicado: ya hay una ejecución completed para este "
                      "día; no se exporta el CSV ni se relanza el pipeline")
            return SKIPPED
        if job_runner.has_processing_lock(engine, JOB_NAME):
            log.event(logging.INFO, CANCELLED, "otra ejecución de %s está en processing: esta instancia se "
                      "cancela sin hacer nada", JOB_NAME)
            return CANCELLED

        details = {"host": socket.gethostname(), "pid": os.getpid()}
        with job_runner.tracked_run(engine, JOB_NAME, target_date, details=details) as run:
            run_id = run.id
            log.event(logging.INFO, "processing", "ejecución %s iniciada (pid %s)", run.id, os.getpid())

            path = csv_path(directory, target_date)
            run.details["csv_path"] = str(path.relative_to(REPO_ROOT) if path.is_relative_to(REPO_ROOT) else path)
            if path.exists():
                run.details["csv_written"] = False
                log.event(logging.INFO, "processing", "el CSV %s ya existe: no se vuelve a exportar",
                          run.details["csv_path"])
            else:
                rows = export_telemetry_csv(engine, target_date, path)
                run.details.update(csv_written=True, csv_rows=rows)
                log.event(logging.INFO, "processing", "exportadas %d filas de telemetry_events a %s",
                          rows, run.details["csv_path"])

            command = pipeline_command(target_date, run.id)
            run.details["pipeline_command"] = _display(command)
            log.event(logging.INFO, "processing", "lanzando el pipeline: %s", run.details["pipeline_command"])
            run.details.update(pipeline_runner(command, pipeline_timeout))
            log.event(logging.INFO, "processing", "pipeline terminado (pipeline_run_id=%s)",
                      run.details.get("pipeline_run_id"))
    except job_runner.JobAlreadyRunning:
        # Dos instancias pasaron la comprobación a la vez; el índice del lock dejó entrar solo a una.
        log.event(logging.INFO, CANCELLED, "otra instancia tomó el lock en el mismo instante: esta se cancela")
        return CANCELLED
    except job_runner.JobAlreadyCompleted:
        log.event(logging.INFO, SKIPPED, "omisión por duplicado: otra instancia completó este día mientras "
                  "esta arrancaba")
        return SKIPPED
    except BaseException as error:  # noqa: BLE001 - se registra y se propaga
        # tracked_run ya dejó la fila en failed; aquí se deja constancia en el log, con traceback.
        log.event(logging.ERROR, "failed", "ejecución %s fallida: %s", run_id or "(sin registrar)",
                  job_runner.error_message(error), exc_info=not isinstance(error, (PipelineFailed, TerminatedBySignal)))
        raise

    log.event(logging.INFO, COMPLETED, "ejecución %s completada", run_id)
    return COMPLETED


def _raise_on_signal(signum: int, _frame) -> None:
    raise TerminatedBySignal(signum)


def main() -> int:
    configure_logging()
    # SIGTERM (docker stop, kill, el scheduler) → excepción: así también pasa por try/finally y la
    # fila queda failed. Ctrl+C ya llega como KeyboardInterrupt.
    signal.signal(signal.SIGTERM, _raise_on_signal)

    # TARGET_DATE se lee antes de cargar el .env: solo cuenta si viene del entorno del proceso. Un
    # TARGET_DATE olvidado en .env haría que cada noche reprocesara (o saltara) el mismo día.
    target_value = os.environ.get("TARGET_DATE")
    load_dotenv(REPO_ROOT / ".env", override=False)
    try:
        target_date = resolve_target_date(target_value, utc_today())
        pipeline_timeout = _minutes("NIGHTLY_EXPORT_PIPELINE_TIMEOUT_MINUTES", DEFAULT_PIPELINE_TIMEOUT)
        stale_after = _minutes("NIGHTLY_EXPORT_STALE_AFTER_MINUTES", DEFAULT_STALE_AFTER)
        engine = job_runner.make_engine()
    except (ConfigError, job_runner.DatabaseNotConfigured) as error:
        JobLog(None).event(logging.ERROR, "failed", "configuración inválida: %s", error)
        return EXIT_CONFIG

    log = JobLog(target_date)
    directory = export_dir()
    log.event(logging.INFO, "started", "inicio de %s (base %s, CSV en %s)", JOB_NAME, job_runner.safe_url(engine),
              directory)
    try:
        run_nightly_export(engine, target_date, directory=directory, pipeline_timeout=pipeline_timeout,
                           stale_after=stale_after)
    except TerminatedBySignal as error:
        return 128 + error.signum
    except KeyboardInterrupt:
        return 128 + signal.SIGINT
    except Exception:  # noqa: BLE001 - ya está en el log y en job_runs
        return EXIT_FAILED
    finally:
        engine.dispose()
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
