"""Fixtures de los jobs programados (hito 21).

`jobs_db` es un SQLite en memoria con `job_runs` y `telemetry_events`: nunca se toca el Supabase
del `.env`.
"""

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import create_engine

from services.job_runner import ensure_job_runs_table
from services.telemetry_models import TelemetryEventRecord


@pytest.fixture
def jobs_db():
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    ensure_job_runs_table(engine)
    TelemetryEventRecord.__table__.create(engine)
    yield engine
    engine.dispose()
