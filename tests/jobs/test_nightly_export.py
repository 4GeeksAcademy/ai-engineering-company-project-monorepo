"""scripts/nightly_export.py (hito 21, Fase 3): exportación, pipeline, job_runs, lock e idempotencia.

Los tests unitarios llaman a `run_nightly_export` con un SQLite en memoria y un pipeline falso.
Los de proceso lanzan el script de verdad (`python scripts/nightly_export.py`) contra un SQLite en
archivo, con el pipeline sustituido por un comando corto (NIGHTLY_EXPORT_PIPELINE_CMD): así se
demuestra el lock con dos instancias simultáneas sin depender de Supabase ni de Prefect.
"""

import csv
import json
import os
import re
import subprocess
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
from sqlalchemy import func, insert, select
from sqlmodel import create_engine

from scripts import nightly_export
from services import job_runner
from services.job_runner import job_runs as RUNS
from services.telemetry_models import TelemetryEventRecord

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "nightly_export.py"
DAY = date(2026, 11, 18)
EVENTS = TelemetryEventRecord.__table__


def _event(timestamp: str, event_type="inbound_order_created", **tags):
    return {
        "id": uuid.uuid4(), "event_type": event_type,
        "timestamp": datetime.fromisoformat(timestamp.replace("Z", "+00:00")),
        "session_id": "s-1", "user_id": "u-1", "source": "api",
        "tags": {"environment": "test", **tags}, "created_at": datetime(2026, 11, 19, tzinfo=timezone.utc),
    }


def store(engine, *events):
    with engine.begin() as connection:
        connection.execute(insert(EVENTS), list(events))


def _runs(engine):
    with engine.connect() as connection:
        return [dict(row._mapping) for row in connection.execute(select(RUNS).order_by(RUNS.c.created_at))]


class FakePipeline:
    def __init__(self, fail_with: BaseException | None = None):
        self.calls: list[list[str]] = []
        self.fail_with = fail_with

    def __call__(self, command, timeout):
        self.calls.append(command)
        if self.fail_with:
            raise self.fail_with
        return {"pipeline_returncode": 0, "pipeline_run_id": "run-1"}


@pytest.fixture
def day_of_telemetry(jobs_db):
    store(
        jobs_db,
        _event("2026-11-17T23:59:59.999Z", warehouse="zaragoza"),           # día anterior
        _event("2026-11-18T00:00:00.000Z", warehouse="zaragoza", quantity=5),
        _event("2026-11-18T12:30:00.000Z", "outbound_order_created", warehouse="los_angeles"),
        _event("2026-11-18T23:59:59.999Z", warehouse="zaragoza"),
        _event("2026-11-19T00:00:00.000Z", warehouse="zaragoza"),           # día siguiente
    )
    return jobs_db


def run(engine, directory, pipeline=None, **kwargs):
    return nightly_export.run_nightly_export(engine, DAY, directory=directory,
                                             pipeline_runner=pipeline or FakePipeline(), **kwargs)


# =========================================================
# target_date
# =========================================================


def test_target_date_defaults_to_yesterday_in_utc():
    assert nightly_export.resolve_target_date(None, date(2026, 11, 19)) == DAY
    assert nightly_export.resolve_target_date("", date(2026, 1, 1)) == date(2025, 12, 31)


def test_target_date_env_overrides_the_default():
    assert nightly_export.resolve_target_date("2026-10-01", date(2026, 11, 19)) == date(2026, 10, 1)


@pytest.mark.parametrize("value", ["18/11/2026", "2026-11-19", "2026-12-01"])
def test_target_date_must_be_a_valid_closed_day(value):
    with pytest.raises(nightly_export.ConfigError):
        nightly_export.resolve_target_date(value, date(2026, 11, 19))


def test_the_pipeline_recomputes_the_week_closed_the_day_after_target_date():
    assert nightly_export.pipeline_week_start(date(2026, 11, 15)) == date(2026, 11, 9)   # domingo → esa semana
    assert nightly_export.pipeline_week_start(date(2026, 11, 18)) == date(2026, 11, 9)   # miércoles → la anterior
    assert nightly_export.pipeline_week_start(date(2026, 11, 16)) == date(2026, 11, 9)


def test_the_default_command_is_the_pipeline_cli_linked_to_the_job_run(monkeypatch):
    monkeypatch.delenv("NIGHTLY_EXPORT_PIPELINE_CMD", raising=False)
    run_id = uuid.uuid4()
    command = nightly_export.pipeline_command(DAY, run_id)
    assert command[:2] == [sys.executable, str(REPO_ROOT / "data" / "pipelines" / "pipeline.py")]
    assert command[2:] == ["--week-start", "2026-11-09", "--lookback-weeks", "1", "--trigger", "scheduled",
                           "--triggered-by", f"nightly_export:{run_id}"]


# =========================================================
# Ejecución completa
# =========================================================


def test_a_run_exports_the_csv_launches_the_pipeline_and_completes(day_of_telemetry, tmp_path):
    pipeline = FakePipeline()
    assert run(day_of_telemetry, tmp_path, pipeline) == "completed"

    path = tmp_path / "telemetry_2026-11-18.csv"
    with path.open(encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))
    assert [row["timestamp"] for row in rows] == [
        "2026-11-18T00:00:00.000Z", "2026-11-18T12:30:00.000Z", "2026-11-18T23:59:59.999Z"]
    assert tuple(rows[0]) == nightly_export.CSV_COLUMNS
    assert json.loads(rows[0]["tags"]) == {"environment": "test", "quantity": 5, "warehouse": "zaragoza"}

    assert len(pipeline.calls) == 1
    [stored] = _runs(day_of_telemetry)
    assert stored["status"] == "completed"
    assert stored["target_date"] == DAY
    assert stored["started_at"] is not None and stored["finished_at"] is not None
    assert stored["error_message"] is None
    assert stored["details"]["csv_rows"] == 3
    assert stored["details"]["csv_written"] is True
    assert stored["details"]["pipeline_run_id"] == "run-1"


def test_a_day_without_events_still_leaves_a_csv_with_the_header(jobs_db, tmp_path):
    assert run(jobs_db, tmp_path) == "completed"
    assert (tmp_path / "telemetry_2026-11-18.csv").read_text(encoding="utf-8").strip() == ",".join(
        nightly_export.CSV_COLUMNS)


def test_an_existing_csv_is_not_exported_again_but_the_pipeline_runs(day_of_telemetry, tmp_path):
    path = tmp_path / "telemetry_2026-11-18.csv"
    path.write_text("export anterior\n", encoding="utf-8")
    pipeline = FakePipeline()
    assert run(day_of_telemetry, tmp_path, pipeline) == "completed"
    assert path.read_text(encoding="utf-8") == "export anterior\n"
    assert len(pipeline.calls) == 1
    assert _runs(day_of_telemetry)[0]["details"]["csv_written"] is False


# =========================================================
# Idempotencia por target_date
# =========================================================


def test_running_twice_on_the_same_day_equals_running_once(day_of_telemetry, tmp_path):
    pipeline = FakePipeline()
    assert run(day_of_telemetry, tmp_path, pipeline) == "completed"
    csv_before = (tmp_path / "telemetry_2026-11-18.csv").read_bytes()
    runs_before = _runs(day_of_telemetry)

    assert run(day_of_telemetry, tmp_path, pipeline) == "skipped"

    assert len(pipeline.calls) == 1                                   # no relanza el pipeline
    assert (tmp_path / "telemetry_2026-11-18.csv").read_bytes() == csv_before
    assert _runs(day_of_telemetry) == runs_before                     # job_runs idéntica
    assert sorted(p.name for p in tmp_path.glob("*telemetry*")) == ["telemetry_2026-11-18.csv"]  # ni .tmp ni copias


def test_another_day_is_not_affected_by_a_completed_one(day_of_telemetry, tmp_path):
    run(day_of_telemetry, tmp_path)
    assert nightly_export.run_nightly_export(day_of_telemetry, date(2026, 11, 17), directory=tmp_path,
                                             pipeline_runner=FakePipeline()) == "completed"
    assert len(_runs(day_of_telemetry)) == 2


def test_a_failed_day_is_retried_on_the_next_run(day_of_telemetry, tmp_path):
    with pytest.raises(nightly_export.PipelineFailed):
        run(day_of_telemetry, tmp_path, FakePipeline(nightly_export.PipelineFailed("exit 1")))
    assert run(day_of_telemetry, tmp_path) == "completed"
    assert [r["status"] for r in _runs(day_of_telemetry)] == ["failed", "completed"]


# =========================================================
# Lock vía processing
# =========================================================


def test_a_run_in_processing_cancels_the_new_instance_silently(day_of_telemetry, tmp_path):
    other = job_runner.claim_run(day_of_telemetry, "nightly_export", date(2026, 11, 17))
    pipeline = FakePipeline()
    assert run(day_of_telemetry, tmp_path, pipeline) == "cancelled"
    assert pipeline.calls == []
    assert not (tmp_path / "telemetry_2026-11-18.csv").exists()
    assert [r["id"] for r in _runs(day_of_telemetry)] == [other]      # sin fila nueva


def test_losing_the_race_for_the_lock_also_cancels(day_of_telemetry, tmp_path, monkeypatch):
    # Las dos instancias pasan has_processing_lock a la vez; el índice único deja entrar a una.
    job_runner.claim_run(day_of_telemetry, "nightly_export", date(2026, 11, 17))
    monkeypatch.setattr(job_runner, "has_processing_lock", lambda *args: False)
    assert run(day_of_telemetry, tmp_path) == "cancelled"
    assert len(_runs(day_of_telemetry)) == 1


# =========================================================
# Fallos: nunca una fila en processing
# =========================================================


def test_a_failing_pipeline_leaves_the_run_failed_with_the_message(day_of_telemetry, tmp_path, caplog):
    error = nightly_export.PipelineFailed("el pipeline terminó con código 1: stage 'extract'")
    with pytest.raises(nightly_export.PipelineFailed):
        run(day_of_telemetry, tmp_path, FakePipeline(error))
    [stored] = _runs(day_of_telemetry)
    assert stored["status"] == "failed"
    assert stored["error_message"] == "PipelineFailed: el pipeline terminó con código 1: stage 'extract'"
    assert stored["finished_at"] is not None
    assert not job_runner.has_processing_lock(day_of_telemetry, "nightly_export")
    assert (tmp_path / "telemetry_2026-11-18.csv").exists()  # el backup del día sí quedó
    assert any(record.levelname == "ERROR" and record.status == "failed" for record in caplog.records)


def test_a_failing_export_leaves_the_run_failed_and_no_partial_csv(jobs_db, tmp_path, monkeypatch):
    def broken_export(engine, day, path):
        path.with_name(f".{path.name}.tmp").write_text("a medias", encoding="utf-8")
        raise OSError("disk full")

    monkeypatch.setattr(nightly_export, "export_telemetry_csv", broken_export)
    pipeline = FakePipeline()
    with pytest.raises(OSError):
        run(jobs_db, tmp_path, pipeline)
    assert _runs(jobs_db)[0]["status"] == "failed"
    assert pipeline.calls == []
    assert not (tmp_path / "telemetry_2026-11-18.csv").exists()


def test_the_real_export_never_leaves_a_half_written_csv(jobs_db, tmp_path):
    with jobs_db.begin() as connection:
        connection.exec_driver_sql("DROP TABLE telemetry_events")
    raw = tmp_path / "raw"
    with pytest.raises(Exception):
        nightly_export.export_telemetry_csv(jobs_db, DAY, raw / "telemetry_2026-11-18.csv")
    assert list(raw.iterdir()) == []


def test_sigterm_during_the_run_leaves_it_failed(day_of_telemetry, tmp_path):
    import signal

    with pytest.raises(nightly_export.TerminatedBySignal):
        run(day_of_telemetry, tmp_path, FakePipeline(nightly_export.TerminatedBySignal(signal.SIGTERM)))
    [stored] = _runs(day_of_telemetry)
    assert stored["status"] == "failed"
    assert "SIGTERM" in stored["error_message"]


def test_a_zombie_from_a_killed_process_is_closed_and_the_day_runs(day_of_telemetry, tmp_path):
    zombie = job_runner.create_run(day_of_telemetry, "nightly_export", date(2026, 11, 17),
                                   now=datetime.now(timezone.utc) - timedelta(hours=6))
    job_runner.mark_processing(day_of_telemetry, zombie, now=datetime.now(timezone.utc) - timedelta(hours=6))
    assert run(day_of_telemetry, tmp_path) == "completed"
    assert job_runner.get_run(day_of_telemetry, zombie)["status"] == "failed"


# =========================================================
# El script como proceso independiente
# =========================================================

LOG_LINE = re.compile(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z (INFO|WARNING|ERROR) job=nightly_export "
                      r"target_date=(\d{4}-\d\d-\d\d|-) status=\w+ ")


@pytest.fixture
def file_db(tmp_path):
    path = tmp_path / "jobs.db"
    engine = create_engine(f"sqlite:///{path.as_posix()}")
    job_runner.ensure_job_runs_table(engine)
    TelemetryEventRecord.__table__.create(engine)
    store(engine, _event("2026-11-18T10:00:00.000Z", warehouse="zaragoza"))
    yield engine
    engine.dispose()


def _script_env(engine, tmp_path, pipeline_code="print('{\"run_id\": \"fake\"}')", **extra):
    return {
        **os.environ,
        "JOB_RUNS_DATABASE_URL": str(engine.url),
        "TARGET_DATE": DAY.isoformat(),
        "NIGHTLY_EXPORT_DIR": str(tmp_path / "raw"),
        "NIGHTLY_EXPORT_PIPELINE_CMD": json.dumps([sys.executable, "-c", pipeline_code]),
        **extra,
    }


def _launch(env):
    return subprocess.Popen([sys.executable, str(SCRIPT)], cwd=REPO_ROOT, env=env, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True, encoding="utf-8")


def test_the_script_does_not_import_fastapi_or_the_api():
    code = ("import sys; sys.path.insert(0, '.'); import scripts.nightly_export; "
            "print(sorted(m for m in sys.modules if m.split('.')[0] in ('fastapi', 'starlette', 'uvicorn') "
            "or m.startswith('services.api')))")
    result = subprocess.run([sys.executable, "-c", code], cwd=REPO_ROOT, capture_output=True, text=True, timeout=120)
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "[]"


def test_the_script_runs_from_the_command_line_and_logs_every_event(file_db, tmp_path):
    process = _launch(_script_env(file_db, tmp_path))
    output, _ = process.communicate(timeout=120)
    assert process.returncode == 0, output

    lines = output.strip().splitlines()
    assert all(LOG_LINE.match(line) for line in lines), output
    assert "status=started" in lines[0]
    assert "status=completed" in lines[-1]
    assert (tmp_path / "raw" / "telemetry_2026-11-18.csv").exists()
    assert [r["status"] for r in _runs(file_db)] == ["completed"]

    second = _launch(_script_env(file_db, tmp_path))
    output, _ = second.communicate(timeout=120)
    assert second.returncode == 0
    assert "status=skipped" in output and "omisión por duplicado" in output
    assert len(_runs(file_db)) == 1


def test_two_simultaneous_instances_run_only_once(file_db, tmp_path):
    # El pipeline falso tarda 8 s: las dos instancias coinciden con seguridad.
    env = _script_env(file_db, tmp_path, pipeline_code="import time; time.sleep(8)")
    first, second = _launch(env), _launch(env)
    outputs = [process.communicate(timeout=180)[0] for process in (first, second)]

    assert first.returncode == 0 and second.returncode == 0, outputs
    assert sum("status=completed" in output for output in outputs) == 1, outputs
    assert sum("status=cancelled" in output for output in outputs) == 1, outputs
    assert [r["status"] for r in _runs(file_db)] == ["completed"]


def test_a_failing_pipeline_exits_with_code_1_and_logs_the_error(file_db, tmp_path):
    env = _script_env(file_db, tmp_path, pipeline_code="import sys; sys.exit('boom from pipeline')")
    process = _launch(env)
    output, _ = process.communicate(timeout=120)
    assert process.returncode == 1
    assert re.search(r"ERROR job=nightly_export target_date=2026-11-18 status=failed .*boom from pipeline", output)
    [stored] = _runs(file_db)
    assert stored["status"] == "failed"
    assert "boom from pipeline" in stored["error_message"]


def test_an_invalid_target_date_exits_with_code_2_without_touching_the_database(file_db, tmp_path):
    process = _launch(_script_env(file_db, tmp_path, TARGET_DATE="mañana"))
    output, _ = process.communicate(timeout=120)
    assert process.returncode == 2
    assert "status=failed configuración inválida" in output
    assert _runs(file_db) == []


def test_job_runs_and_pipeline_runs_stay_separate():
    from data.pipelines.weekly_warehouse_client_performance.schema import pipeline_runs

    assert RUNS.name == "job_runs" and RUNS.schema is None
    assert (pipeline_runs.schema, pipeline_runs.name) == ("reporting", "pipeline_runs")
    assert RUNS.metadata is not pipeline_runs.metadata
