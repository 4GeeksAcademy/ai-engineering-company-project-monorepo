from __future__ import annotations

import os
from pathlib import Path

from tinydb import TinyDB

DATABASE_PATH = Path(
    os.getenv(
        "SUPPLIERS_DB_PATH",
        Path(__file__).resolve().parent / "data" / "suppliers.json",
    )
)
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
db = TinyDB(DATABASE_PATH)
suppliers_table = db.table("suppliers")
supplier_status_history_table = db.table("supplier_status_history")