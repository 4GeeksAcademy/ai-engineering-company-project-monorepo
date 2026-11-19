"""services/job_runner (hito 21, Fase 2): máquina de estados, lock e idempotencia de job_runs."""

from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import func, select

from services import job_runner
from services.job_runner import (
    InvalidTransition, JobAlreadyCompleted, JobAlreadyRunning, job_runs as RUNS,
)

JOB = "nightly_export"
DAY = date(2026, 11, 18)
OTHER_DAY = date(2026, 11, 17)


def _statuses(engine, job_name=JOB):
    with engine.connect() as connection:
        return [row.status for row in connection.execute(
            select(RUNS.c.status).where(RUNS.c.job_name == job_name).order_by(RUNS.c.created_at))]


def _count(engine):
    with engine.connect() as connection:
        return connection.execute(select(func.count()).select_from(RUNS)).scalar_one()


# =========================================================
# pending → processing → completed | failed
# =========================================================


def test_a_new_run_starts_pending_with_its_target_date(jobs_db):
    run_id = job_runner.create_run(jobs_db, JOB, DAY)
    run = job_runner.get_run(jobs_db, run_id)
    assert run["status"] == "pending"
    assert run["target_date"] == "2026-11-18"
    assert run["created_at"] is not None
    assert run["started_at"] is None and run["finished_at"] is None


def test_the_happy_path_goes_pending_processing_completed(jobs_db):
    run_id = job_runner.create_run(jobs_db, JOB, DAY)
    job_runner.mark_processing(jobs_db, run_id)
    assert job_runner.get_run(jobs_db, run_id)["status"] == "processing"
    assert job_runner.get_run(jobs_db, run_id)["started_at"] is not None

    job_runner.mark_completed(jobs_db, run_id, details={"csv_rows": 3})
    run = job_runner.get_run(jobs_db, run_id)
    assert run["status"] == "completed"
    assert run["finished_at"] is not None
    assert run["details"] == {"csv_rows": 3}
    assert run["error_message"] is None


def test_a_failure_keeps_the_exception_message(jobs_db):
    run_id = job_runner.create_run(jobs_db, JOB, DAY)
    job_runner.mark_processing(jobs_db, run_id)
    assert job_runner.mark_failed(jobs_db, run_id, "RuntimeError: pipeline exited with code 1")
    run = job_runner.get_run(jobs_db, run_id)
    assert run["status"] == "failed"
    assert run["error_message"] == "RuntimeError: pipeline exited with code 1"
    assert run["finished_at"] is not None


def test_a_pending_run_can_fail_too(jobs_db):
    run_id = job_runner.create_run(jobs_db, JOB, DAY)
    assert job_runner.mark_failed(jobs_db, run_id, "boom")
    assert job_runner.get_run(jobs_db, run_id)["status"] == "failed"


def test_transitions_out_of_order_are_rejected(jobs_db):
    run_id = job_runner.create_run(jobs_db, JOB, DAY)
    with pytest.raises(InvalidTransition):
        job_runner.mark_completed(jobs_db, run_id)  # pending → completed no existe
    job_runner.mark_processing(jobs_db, run_id)
    job_runner.mark_completed(jobs_db, run_id)
    with pytest.raises(InvalidTransition):
        job_runner.mark_processing(jobs_db, run_id)
    assert not job_runner.mark_failed(jobs_db, run_id, "late")  # una completed no pasa a failed
    assert job_runner.get_run(jobs_db, run_id)["status"] == "completed"


def test_long_error_messages_are_truncated(jobs_db):
    run_id = job_runner.create_run(jobs_db, JOB, DAY)
    job_runner.mark_failed(jobs_db, run_id, "x" * 5000)
    assert len(job_runner.get_run(jobs_db, run_id)["error_message"]) == job_runner.runs.MAX_ERROR_MESSAGE


# =========================================================
# Lock vía processing
# =========================================================


def test_has_processing_lock_looks_at_the_job_not_the_day(jobs_db):
    assert not job_runner.has_processing_lock(jobs_db, JOB)
    job_runner.claim_run(jobs_db, JOB, OTHER_DAY)
    assert job_runner.has_processing_lock(jobs_db, JOB)
    assert not job_runner.has_processing_lock(jobs_db, "other_job")


def test_a_second_claim_while_processing_fails_and_leaves_no_row(jobs_db):
    first = job_runner.claim_run(jobs_db, JOB, DAY)
    with pytest.raises(JobAlreadyRunning):
        job_runner.claim_run(jobs_db, JOB, DAY)
    assert _statuses(jobs_db) == ["processing"]
    job_runner.mark_completed(jobs_db, first)


def test_the_lock_is_released_when_the_run_finishes(jobs_db):
    first = job_runner.claim_run(jobs_db, JOB, OTHER_DAY)
    job_runner.mark_failed(jobs_db, first, "boom")
    assert not job_runner.has_processing_lock(jobs_db, JOB)
    job_runner.claim_run(jobs_db, JOB, DAY)  # ya no lanza


# =========================================================
# Idempotencia por target_date
# =========================================================


def test_has_completed_for_date_needs_the_same_job_and_day(jobs_db):
    run_id = job_runner.claim_run(jobs_db, JOB, DAY)
    assert not job_runner.has_completed_for_date(jobs_db, JOB, DAY)  # processing no cuenta
    job_runner.mark_completed(jobs_db, run_id)
    assert job_runner.has_completed_for_date(jobs_db, JOB, DAY)
    assert not job_runner.has_completed_for_date(jobs_db, JOB, OTHER_DAY)
    assert not job_runner.has_completed_for_date(jobs_db, "other_job", DAY)


def test_a_failed_run_does_not_count_as_done(jobs_db):
    run_id = job_runner.claim_run(jobs_db, JOB, DAY)
    job_runner.mark_failed(jobs_db, run_id, "boom")
    assert not job_runner.has_completed_for_date(jobs_db, JOB, DAY)


def test_claiming_a_completed_day_fails_and_leaves_no_row(jobs_db):
    job_runner.mark_completed(jobs_db, job_runner.claim_run(jobs_db, JOB, DAY))
    with pytest.raises(JobAlreadyCompleted):
        job_runner.claim_run(jobs_db, JOB, DAY)
    assert _statuses(jobs_db) == ["completed"]
    assert not job_runner.has_processing_lock(jobs_db, JOB)


# =========================================================
# tracked_run: nunca deja una fila en processing
# =========================================================


def test_tracked_run_completes_and_saves_the_details(jobs_db):
    with job_runner.tracked_run(jobs_db, JOB, DAY) as run:
        assert job_runner.get_run(jobs_db, run.id)["status"] == "processing"
        run.details["csv_rows"] = 7
    stored = job_runner.get_run(jobs_db, run.id)
    assert stored["status"] == "completed"
    assert stored["details"] == {"csv_rows": 7}


def test_tracked_run_marks_failed_and_propagates_the_exception(jobs_db):
    with pytest.raises(ValueError, match="bad csv"):
        with job_runner.tracked_run(jobs_db, JOB, DAY) as run:
            run.details["step"] = "export"
            raise ValueError("bad csv")
    stored = job_runner.get_run(jobs_db, run.id)
    assert stored["status"] == "failed"
    assert stored["error_message"] == "ValueError: bad csv"
    assert stored["details"] == {"step": "export"}
    assert not job_runner.has_processing_lock(jobs_db, JOB)


@pytest.mark.parametrize("interruption", [KeyboardInterrupt, SystemExit])
def test_tracked_run_also_closes_on_interruptions(jobs_db, interruption):
    with pytest.raises(interruption):
        with job_runner.tracked_run(jobs_db, JOB, DAY) as run:
            raise interruption()
    assert job_runner.get_run(jobs_db, run.id)["status"] == "failed"


def test_tracked_run_fails_if_closing_as_completed_fails(jobs_db, monkeypatch):
    def broken(*args, **kwargs):
        raise ConnectionError("db went away")

    monkeypatch.setattr(job_runner.runs, "mark_completed", broken)
    with pytest.raises(ConnectionError):
        with job_runner.tracked_run(jobs_db, JOB, DAY) as run:
            pass
    stored = job_runner.get_run(jobs_db, run.id)
    assert stored["status"] == "failed"
    assert "db went away" in stored["error_message"]


def test_tracked_run_refuses_to_start_without_writing_a_row(jobs_db):
    job_runner.claim_run(jobs_db, JOB, OTHER_DAY)
    with pytest.raises(JobAlreadyRunning):
        with job_runner.tracked_run(jobs_db, JOB, DAY):
            pytest.fail("el cuerpo no debe ejecutarse sin el lock")
    assert _count(jobs_db) == 1


# =========================================================
# Zombis de procesos muertos
# =========================================================


def test_stale_runs_are_failed_so_they_release_the_lock(jobs_db):
    now = datetime(2026, 11, 19, 2, 30, tzinfo=timezone.utc)
    stuck = job_runner.create_run(jobs_db, JOB, OTHER_DAY, now=now - timedelta(hours=5))
    job_runner.mark_processing(jobs_db, stuck, now=now - timedelta(hours=5))
    orphan = job_runner.create_run(jobs_db, JOB, DAY, now=now - timedelta(hours=1))

    closed = job_runner.fail_stale_runs(jobs_db, JOB, processing_older_than=timedelta(hours=2), now=now)

    assert closed == 2
    assert job_runner.get_run(jobs_db, stuck)["error_message"].startswith("stale: seguía en processing")
    assert job_runner.get_run(jobs_db, orphan)["status"] == "failed"
    assert not job_runner.has_processing_lock(jobs_db, JOB)


def test_a_recent_processing_run_is_not_stale(jobs_db):
    job_runner.claim_run(jobs_db, JOB, DAY)
    assert job_runner.fail_stale_runs(jobs_db, JOB, processing_older_than=timedelta(hours=2)) == 0
    assert job_runner.has_processing_lock(jobs_db, JOB)


def test_list_runs_filters_by_day(jobs_db):
    job_runner.mark_failed(jobs_db, job_runner.claim_run(jobs_db, JOB, DAY), "boom")
    job_runner.mark_completed(jobs_db, job_runner.claim_run(jobs_db, JOB, DAY))
    job_runner.mark_completed(jobs_db, job_runner.claim_run(jobs_db, JOB, OTHER_DAY))
    assert [run["status"] for run in job_runner.list_runs(jobs_db, JOB, DAY)] == ["completed", "failed"]
    assert len(job_runner.list_runs(jobs_db, JOB)) == 3
