"""Environment-driven settings for the Brasaland central API."""

from __future__ import annotations

import os

# Phase 1 capture stub. The next phase points this at the persistent collector.
# The route stays POST /telemetry/events; this variable establishes the pattern.
TELEMETRY_ENDPOINT = os.getenv(
    "TELEMETRY_ENDPOINT",
    "http://127.0.0.1:8000/telemetry/events",
)
