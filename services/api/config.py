"""Environment-driven settings for the Brasaland central API."""

from __future__ import annotations

import os

# Public URL of POST /telemetry/events. The handler persists to Supabase.
TELEMETRY_ENDPOINT = os.getenv(
    "TELEMETRY_ENDPOINT",
    "http://127.0.0.1:8000/telemetry/events",
)
