"""Brasaland Reporting API — HTTP shell for weekly location KPIs.

Own FastAPI app under ``services/reporting/``, separate from
``services/telemetry`` and from the engineering ``GET /telemetry/report``.

Uses the same Bearer JWT auth and error envelope as the central API.
Routes are also mounted on ``services/api/app.py`` so
``uvicorn api.app:app`` exposes them at the same paths.

Run standalone::

    uvicorn services.reporting.main:app --reload --port 8002
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

from services.reporting.routes import router

load_dotenv()

logger = logging.getLogger("brasaland.reporting")

app = FastAPI(
    title="Brasaland Reporting API",
    description=(
        "Weekly location cost & waste reporting shell. "
        "Status, manual trigger, and KPI query for reporting.weekly_location_performance. "
        "Not the engineering telemetry reader. Bearer JWT required."
    ),
    version="1.0.0",
    debug=False,
)

_api_dir = Path(__file__).resolve().parents[1] / "api"
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))
try:
    from errors import register_error_handlers

    register_error_handlers(app)
except ImportError:
    logger.debug("central API error handlers not on path; using FastAPI defaults")

app.include_router(router)
