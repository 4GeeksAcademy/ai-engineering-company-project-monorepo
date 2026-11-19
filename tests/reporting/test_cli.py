"""`python data/pipelines/pipeline.py` como script de CLI (hito 19, Fase 4)."""

import json
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import func, select

from data.pipelines import pipeline
from data.pipelines.weekly_warehouse_client_performance.schema import pipeline_runs as RUNS
from tests.reporting.conftest import PREVIOUS_WEEK, WEEK, inventory_event, store

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "data" / "pipelines" / "pipeline.py"


def test_the_script_runs_from_the_command_line_and_documents_its_options():
    # Proceso nuevo, desde la raíz del repo, igual que lo lanzaría una persona o un cron.
    result = subprocess.run([sys.executable, str(SCRIPT), "--help"], cwd=REPO_ROOT, capture_output=True,
                            text=True, timeout=120)
    assert result.returncode == 0, result.stderr
    for option in ("--week-start", "--lookback-weeks", "--environment", "--backfill-from", "--serve"):
        assert option in result.stdout


def test_week_start_must_be_a_monday():
    with pytest.raises(SystemExit):
        pipeline.parse_args(["--week-start", "2026-11-03"])
    with pytest.raises(SystemExit):
        pipeline.parse_args(["--backfill-from", "2026-11-02"])


@pytest.mark.usefixtures("prefect_server")
def test_main_runs_the_full_flow_and_prints_the_run_summary(week_of_activity, capsys):
    assert pipeline.main(["--week-start", WEEK.isoformat(), "--lookback-weeks", "0"]) == 0
    summary = json.loads(capsys.readouterr().out)
    assert summary["status"] == "completed"
    assert summary["rows_upserted"] == 3
    with week_of_activity.connect() as connection:
        assert connection.execute(select(RUNS.c.trigger)).scalar_one() == "manual"


@pytest.mark.usefixtures("prefect_server")
def test_a_scheduled_trigger_is_recorded_with_who_launched_it(week_of_activity, capsys):
    # Lo que pasa scripts/nightly_export.py (hito 21): enlaza pipeline_runs con su fila de job_runs.
    assert pipeline.main(["--week-start", WEEK.isoformat(), "--lookback-weeks", "0", "--trigger", "scheduled",
                          "--triggered-by", "nightly_export:abc"]) == 0
    capsys.readouterr()
    with week_of_activity.connect() as connection:
        row = connection.execute(select(RUNS.c.trigger, RUNS.c.triggered_by)).one()
    assert tuple(row) == ("scheduled", "nightly_export:abc")


@pytest.mark.usefixtures("prefect_server")
def test_backfill_runs_one_subflow_per_week(week_of_activity, capsys):
    store(week_of_activity, inventory_event("outbound_order_created", "2026-10-28T10:00:00.000Z"))
    assert pipeline.main(["--backfill-from", PREVIOUS_WEEK.isoformat(), "--backfill-to", WEEK.isoformat()]) == 0
    summaries = json.loads(capsys.readouterr().out)
    assert [s["weeks_processed"] for s in summaries] == [[PREVIOUS_WEEK.isoformat()], [WEEK.isoformat()]]
    with week_of_activity.connect() as connection:
        triggers = connection.execute(select(RUNS.c.trigger, func.count()).group_by(RUNS.c.trigger)).all()
    assert triggers == [("backfill", 2)]


@pytest.mark.usefixtures("prefect_server")
def test_a_failed_run_exits_with_code_1(week_of_activity, monkeypatch, capsys):
    from data.pipelines.weekly_warehouse_client_performance import extract

    monkeypatch.setattr(extract, "extract_inventory_events", lambda *a, **k: (_ for _ in ()).throw(KeyError("tags")))
    assert pipeline.main(["--lookback-weeks", "0"]) == 1
    assert "stage 'extract'" in capsys.readouterr().err
