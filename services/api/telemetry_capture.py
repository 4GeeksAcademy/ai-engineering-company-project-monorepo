"""Append-only local telemetry capture used when Supabase is unavailable."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

REPO_ROOT = Path(__file__).resolve().parents[2]
CAPTURE_PATH = REPO_ROOT / "data" / "process" / "captured_telemetry.jsonl"


def _parse_iso(value: str) -> datetime | None:
    text = (value or "").strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)

ALLOWED_EVENT_TYPES = frozenset(
    {
        "page_view",
        "section_navigation",
        "user_login_succeeded",
        "user_login_failed",
        "api_error",
    }
)


def _utcnow() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def record_event(event_type: str, tags: dict[str, Any] | None = None, timestamp: str | None = None) -> dict[str, Any]:
    if event_type not in ALLOWED_EVENT_TYPES:
        raise ValueError(f"event_type must be one of {sorted(ALLOWED_EVENT_TYPES)}")
    event = {
        "id": str(uuid4()),
        "timestamp": timestamp or _utcnow(),
        "event_type": event_type,
        "tags": tags or {},
    }
    CAPTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CAPTURE_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=True) + "\n")
    return event


def load_captured(start_iso: str, end_iso: str) -> list[dict[str, Any]]:
    if not CAPTURE_PATH.exists():
        return []
    events: list[dict[str, Any]] = []
    for line in CAPTURE_PATH.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        stamp = str(row.get("timestamp") or "")
        moment = _parse_iso(stamp)
        start = _parse_iso(start_iso)
        end = _parse_iso(end_iso)
        if moment is None or start is None or end is None:
            continue
        if moment < start or moment > end:
            continue
        events.append(
            {
                "id": row.get("id"),
                "timestamp": stamp,
                "event_type": row.get("event_type") or "",
                "tags": row.get("tags") or {},
            }
        )
    return events
