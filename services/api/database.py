from __future__ import annotations

from pathlib import Path

from tinydb import TinyDB
from tinydb.table import Table

DB_PATH = Path(__file__).resolve().parent / "data" / "suppliers.json"

_db: TinyDB | None = None


def get_db() -> TinyDB:
    global _db
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if _db is None:
        _db = TinyDB(DB_PATH)
    return _db


def get_suppliers_table() -> Table:
    return get_db().table("suppliers")


def close_db() -> None:
    global _db
    if _db is not None:
        _db.close()
        _db = None
