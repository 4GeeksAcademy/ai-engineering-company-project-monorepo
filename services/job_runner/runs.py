"""Máquina de estados de `job_runs`: crear, transicionar y consultar ejecuciones (hito 21).

    create_run()               → pending      (la ejecución queda registrada)
    mark_processing()          pending → processing   (toma el lock; JobAlreadyRunning si otro lo tiene)
    mark_completed()           processing → completed
    mark_failed()              pending | processing → failed (con el mensaje de la excepción)

    claim_run()                create_run + mark_processing + comprobación de idempotencia, atómico
    tracked_run()              context manager: claim_run y, al salir, completed o failed. Nunca
                               deja una fila en processing (try/except/finally).

    has_processing_lock()      ¿hay alguna ejecución processing de este job?
    has_completed_for_date()   ¿ya hay una completed de este job para este día?
    fail_stale_runs()          filas pending/processing de un proceso que murió sin cerrarlas → failed

Cada escritura va en su propia transacción: si el trabajo del job falla, el registro del fallo
no se pierde con él.

**El lock es el estado `processing`**, no una tabla aparte: el índice único parcial
`ux_job_runs_one_processing` impide que dos filas del mismo job estén en processing a la vez. Si
dos instancias arrancan en el mismo instante, las dos pueden ver «no hay lock», pero solo una
consigue escribir `processing`; la otra recibe un IntegrityError y aborta.
"""

import logging
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterator

from sqlalchemy import delete, exists, insert, select, update
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.exc import IntegrityError

from .schema import COMPLETED, FAILED, PENDING, PROCESSING, job_runs as RUNS

logger = logging.getLogger("services.job_runner")

MAX_ERROR_MESSAGE = 2000


class JobAlreadyRunning(RuntimeError):
    """Otra ejecución de este job está en `processing` (el lock está tomado)."""


class JobAlreadyCompleted(RuntimeError):
    """Ya hay una ejecución `completed` de este job para este día."""


class InvalidTransition(RuntimeError):
    """La fila no estaba en el estado de origen de la transición."""


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def error_message(error: BaseException) -> str:
    """`Tipo: mensaje` de una excepción, recortado para la columna."""
    text = f"{type(error).__name__}: {error}".strip().rstrip(":")
    return text[:MAX_ERROR_MESSAGE]


# =========================================================
# Consultas
# =========================================================


def _processing_exists(connection: Connection, job_name: str) -> bool:
    return connection.execute(
        select(exists().where(RUNS.c.job_name == job_name, RUNS.c.status == PROCESSING))
    ).scalar()


def _completed_exists(connection: Connection, job_name: str, target_date: date) -> bool:
    return connection.execute(
        select(exists().where(RUNS.c.job_name == job_name, RUNS.c.target_date == target_date,
                              RUNS.c.status == COMPLETED))
    ).scalar()


def has_processing_lock(engine: Engine, job_name: str) -> bool:
    """True si alguna ejecución de `job_name` (de cualquier día) está en `processing`."""
    with engine.connect() as connection:
        return _processing_exists(connection, job_name)


def has_completed_for_date(engine: Engine, job_name: str, target_date: date) -> bool:
    """True si ya hay una ejecución `completed` de `job_name` para `target_date`.

    El día forma parte de la clave: que el job terminara bien ayer no dice nada de hoy.
    """
    with engine.connect() as connection:
        return _completed_exists(connection, job_name, target_date)


def _serialize(row) -> dict[str, Any]:
    run = dict(row._mapping)
    run["id"] = str(run["id"])
    run["target_date"] = run["target_date"].isoformat()
    for column in ("started_at", "finished_at", "created_at"):
        if (moment := run[column]) is not None:
            if moment.tzinfo is None:  # SQLite devuelve datetimes sin zona: se guardaron en UTC
                moment = moment.replace(tzinfo=timezone.utc)
            run[column] = moment.isoformat(timespec="seconds").replace("+00:00", "Z")
    return run


def get_run(engine: Engine, run_id: uuid.UUID) -> dict[str, Any] | None:
    with engine.connect() as connection:
        row = connection.execute(select(RUNS).where(RUNS.c.id == run_id)).first()
    return _serialize(row) if row else None


def list_runs(engine: Engine, job_name: str, target_date: date | None = None, limit: int = 20) -> list[dict[str, Any]]:
    """Ejecuciones de `job_name` (de un día, si se indica), de la más reciente a la más antigua."""
    query = select(RUNS).where(RUNS.c.job_name == job_name)
    if target_date is not None:
        query = query.where(RUNS.c.target_date == target_date)
    with engine.connect() as connection:
        rows = connection.execute(query.order_by(RUNS.c.created_at.desc()).limit(limit)).all()
    return [_serialize(row) for row in rows]


# =========================================================
# Transiciones
# =========================================================


def create_run(engine: Engine, job_name: str, target_date: date, *, details: dict | None = None,
               now: datetime | None = None) -> uuid.UUID:
    """Registra una ejecución nueva en `pending` y devuelve su id."""
    run_id = uuid.uuid4()
    with engine.begin() as connection:
        connection.execute(insert(RUNS).values(
            id=run_id, job_name=job_name, target_date=target_date, status=PENDING,
            details=details or {}, created_at=now or utc_now(),
        ))
    return run_id


def _to_processing(connection: Connection, run_id: uuid.UUID, now: datetime) -> None:
    try:
        result = connection.execute(
            update(RUNS).where(RUNS.c.id == run_id, RUNS.c.status == PENDING)
            .values(status=PROCESSING, started_at=now)
        )
    except IntegrityError as error:  # ux_job_runs_one_processing
        raise JobAlreadyRunning("otra ejecución del job está en processing") from error
    if result.rowcount != 1:
        raise InvalidTransition(f"la ejecución {run_id} no está en pending")


def mark_processing(engine: Engine, run_id: uuid.UUID, *, now: datetime | None = None) -> None:
    """pending → processing. Lanza JobAlreadyRunning si otra ejecución del job tiene el lock."""
    with engine.begin() as connection:
        _to_processing(connection, run_id, now or utc_now())


def mark_completed(engine: Engine, run_id: uuid.UUID, *, details: dict | None = None,
                   now: datetime | None = None) -> None:
    """processing → completed."""
    values: dict[str, Any] = {"status": COMPLETED, "finished_at": now or utc_now()}
    if details is not None:
        values["details"] = details
    try:
        with engine.begin() as connection:
            result = connection.execute(
                update(RUNS).where(RUNS.c.id == run_id, RUNS.c.status == PROCESSING).values(**values)
            )
    except IntegrityError as error:  # ux_job_runs_one_completed_per_date
        raise JobAlreadyCompleted("ya hay una ejecución completed para este día") from error
    if result.rowcount != 1:
        raise InvalidTransition(f"la ejecución {run_id} no está en processing")


def mark_failed(engine: Engine, run_id: uuid.UUID, message: str, *, details: dict | None = None,
                now: datetime | None = None) -> bool:
    """pending | processing → failed, con el mensaje de error. False si ya estaba cerrada."""
    values: dict[str, Any] = {
        "status": FAILED, "finished_at": now or utc_now(),
        "error_message": (message or "error desconocido")[:MAX_ERROR_MESSAGE],
    }
    if details is not None:
        values["details"] = details
    with engine.begin() as connection:
        result = connection.execute(
            update(RUNS).where(RUNS.c.id == run_id, RUNS.c.status.in_((PENDING, PROCESSING))).values(**values)
        )
    return result.rowcount == 1


def _discard_pending(engine: Engine, run_id: uuid.UUID) -> None:
    """Borra una fila que nunca llegó a processing (perdió la carrera por el lock o el día ya
    estaba hecho): no fue una ejecución, y dejarla cambiaría la tabla respecto a una sola corrida."""
    with engine.begin() as connection:
        connection.execute(delete(RUNS).where(RUNS.c.id == run_id, RUNS.c.status == PENDING))


def claim_run(engine: Engine, job_name: str, target_date: date, *, details: dict | None = None,
              now: datetime | None = None) -> uuid.UUID:
    """Registra la ejecución (pending) y toma el lock (processing). Devuelve su id.

    La comprobación de idempotencia se repite **dentro** de la transacción que toma el lock: si
    otra instancia terminó el mismo día justo entre la consulta previa del script y este
    momento, se ve aquí. Si no se puede tomar el lock, la fila pending se borra y se lanza:

    - JobAlreadyRunning: otra ejecución del job está en processing.
    - JobAlreadyCompleted: el día ya está completed.
    """
    run_id = create_run(engine, job_name, target_date, details=details, now=now)
    try:
        with engine.begin() as connection:
            _to_processing(connection, run_id, utc_now())
            if _completed_exists(connection, job_name, target_date):
                raise JobAlreadyCompleted(f"{job_name} ya está completed para {target_date}")
    except (JobAlreadyRunning, JobAlreadyCompleted):
        _discard_pending(engine, run_id)  # el ROLLBACK la dejó en pending
        raise
    except BaseException as error:
        mark_failed(engine, run_id, error_message(error))
        raise
    return run_id


def fail_stale_runs(engine: Engine, job_name: str, *, processing_older_than: timedelta,
                    pending_older_than: timedelta = timedelta(minutes=10), now: datetime | None = None) -> int:
    """Marca `failed` las filas que un proceso muerto dejó abiertas. Devuelve cuántas.

    try/finally cubre cualquier excepción de Python, pero no un `kill -9`, un OOM o un apagado de
    la máquina. Esas filas se cierran aquí, al empezar la siguiente ejecución, para que ningún
    registro se quede en processing (ni bloquee el lock) indefinidamente.
    """
    now = now or utc_now()
    with engine.begin() as connection:
        stale_processing = connection.execute(
            update(RUNS).where(RUNS.c.job_name == job_name, RUNS.c.status == PROCESSING,
                               RUNS.c.started_at < now - processing_older_than)
            .values(status=FAILED, finished_at=now,
                    error_message=f"stale: seguía en processing después de {processing_older_than} "
                                  "(el proceso murió sin cerrarla)")
        ).rowcount
        stale_pending = connection.execute(
            update(RUNS).where(RUNS.c.job_name == job_name, RUNS.c.status == PENDING,
                               RUNS.c.created_at < now - pending_older_than)
            .values(status=FAILED, finished_at=now,
                    error_message=f"stale: seguía en pending después de {pending_older_than}")
        ).rowcount
    return stale_processing + stale_pending


# =========================================================
# Ejecución gestionada
# =========================================================


@dataclass
class TrackedRun:
    """La ejecución en curso: su id y los detalles que se guardarán al cerrarla."""

    id: uuid.UUID
    job_name: str
    target_date: date
    details: dict[str, Any] = field(default_factory=dict)


def _fail_safely(engine: Engine, run: TrackedRun, message: str, attempts: int = 3) -> None:
    """mark_failed con reintentos: es lo único que separa un fallo de un zombi."""
    for attempt in range(1, attempts + 1):
        try:
            mark_failed(engine, run.id, message, details=run.details)
            return
        except Exception as error:  # noqa: BLE001 - la base también puede estar fallando
            logger.error("no se pudo marcar failed la ejecución %s (intento %d/%d): %s",
                         run.id, attempt, attempts, error)
            if attempt < attempts:
                time.sleep(attempt)
    logger.error("la ejecución %s queda abierta: fail_stale_runs la cerrará en la siguiente", run.id)


@contextmanager
def tracked_run(engine: Engine, job_name: str, target_date: date, *,
                details: dict | None = None) -> Iterator[TrackedRun]:
    """Ejecuta el cuerpo del `with` como una ejecución registrada de `job_name` para `target_date`.

        with tracked_run(engine, "nightly_export", day) as run:
            ...                       # processing
            run.details["rows"] = n   # se guarda al cerrar
        # salida normal → completed; cualquier excepción → failed (y se propaga)

    Al entrar lanza JobAlreadyRunning / JobAlreadyCompleted (ver `claim_run`) sin dejar fila.
    """
    run = TrackedRun(claim_run(engine, job_name, target_date, details=details), job_name, target_date,
                     dict(details or {}))
    closed = False
    failure = "terminó sin registrar su resultado"
    try:
        yield run
        mark_completed(engine, run.id, details=run.details)
        closed = True
    except BaseException as error:  # también KeyboardInterrupt, SystemExit o una señal convertida
        failure = error_message(error)
        raise
    finally:
        # Si el cuerpo o el propio mark_completed fallaron, la fila sigue en processing: se cierra
        # como failed antes de propagar. Nunca sale de aquí una fila en processing.
        if not closed:
            _fail_safely(engine, run, failure)
