"""Settings read from the environment, with services/api/.env loaded first.

Values already set in the real environment win over the .env file, so tests
and deployments can override them without editing files.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

API_ROOT = Path(__file__).resolve().parent
load_dotenv(API_ROOT / ".env")


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is not set; copy services/api/.env.example to services/api/.env and fill it in")
    return value


def _positive_int(name: str, value: str) -> int:
    try:
        number = int(value)
    except ValueError:
        number = 0
    if number <= 0:
        raise RuntimeError(f"{name} must be a positive whole number of minutes")
    return number


SECRET_KEY = _required("SECRET_KEY")
ALGORITHM = _required("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = _positive_int("ACCESS_TOKEN_EXPIRE_MINUTES", _required("ACCESS_TOKEN_EXPIRE_MINUTES"))

# Password reset by email (Resend). Without RESEND_API_KEY the API still starts:
# reset emails then fail and the error is logged (the response never reveals it).
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
EMAIL_FROM = os.environ.get("EMAIL_FROM", "").strip() or "onboarding@resend.dev"
FRONTEND_URL = (os.environ.get("FRONTEND_URL", "").strip() or "http://localhost:3000").rstrip("/")
RESET_TOKEN_EXPIRE_MINUTES = _positive_int(
    "RESET_TOKEN_EXPIRE_MINUTES", os.environ.get("RESET_TOKEN_EXPIRE_MINUTES", "").strip() or "30"
)

# Where telemetry events are sent. Read here (and exported) to fix the pattern now: the frontend
# gets the same URL as NEXT_PUBLIC_TELEMETRY_ENDPOINT. Today it points at this API's own stub
# (routes/telemetry.py); Phase 3 points it at the real intake and nothing else changes.
TELEMETRY_ENDPOINT = os.environ.get("TELEMETRY_ENDPOINT", "").strip() or "http://localhost:8000/telemetry/events"


def database_url() -> str:
    """Postgres (Supabase) connection string for the inventory ORM, read when the engine is first built.

    Not read at import time so the rest of the API (and its tests) never needs it.
    """
    return _required("DATABASE_URL")
