"""SQLite dead-letter queue for Celery tasks that exhaust retries."""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "data" / "celery_dead_letters.sqlite3"


def _connect(db_path: Path = DEFAULT_DB_PATH) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Path = DEFAULT_DB_PATH) -> None:
    with _connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS celery_dead_letters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                attempt INTEGER NOT NULL,
                error_message TEXT NOT NULL,
                recorded_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def record_dead_letter(
    task_id: str,
    attempt: int,
    error_message: str,
    recorded_at: Optional[datetime] = None,
    db_path: Path = DEFAULT_DB_PATH,
) -> Dict[str, Any]:
    """Persist a failed task after max_retries are exceeded."""
    init_db(db_path)
    ts = (recorded_at or datetime.now(timezone.utc)).isoformat()
    with _connect(db_path) as conn:
        cur = conn.execute(
            """
            INSERT INTO celery_dead_letters (task_id, attempt, error_message, recorded_at)
            VALUES (?, ?, ?, ?)
            """,
            (task_id, attempt, error_message, ts),
        )
        conn.commit()
        row_id = cur.lastrowid
    return {
        "id": row_id,
        "task_id": task_id,
        "attempt": attempt,
        "error_message": error_message,
        "recorded_at": ts,
    }


def list_dead_letters(db_path: Path = DEFAULT_DB_PATH) -> List[Dict[str, Any]]:
    init_db(db_path)
    with _connect(db_path) as conn:
        rows = conn.execute(
            "SELECT id, task_id, attempt, error_message, recorded_at "
            "FROM celery_dead_letters ORDER BY id DESC"
        ).fetchall()
    return [dict(row) for row in rows]
