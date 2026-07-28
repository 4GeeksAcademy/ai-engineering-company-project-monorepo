"""TinyDB initialization and helpers for backend persistence."""

from __future__ import annotations

import os
from pathlib import Path

from tinydb import TinyDB
from tinydb.table import Table

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "data" / "suppliers.json"
DB_PATH = Path(os.getenv("TINYDB_PATH", str(DEFAULT_DB_PATH)))

# Ensure the destination directory exists before TinyDB opens the file.
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

db = TinyDB(DB_PATH)
suppliers_table = db.table("suppliers")


def get_db() -> TinyDB:
    """Return the TinyDB client instance."""

    return db


def get_suppliers_table() -> Table:
    """Return the suppliers table handle."""

    return suppliers_table
