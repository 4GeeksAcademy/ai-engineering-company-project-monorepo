"""
database.py — Brasaland · TinyDB initialization

Centralized database access for all domains.
The DB file is located next to this module for predictability across CWDs.
"""

from __future__ import annotations

import os
from pathlib import Path

from tinydb import TinyDB

# Resolve relative to this file's location (services/api/app/) → go up to services/
_api_root = Path(__file__).resolve().parent.parent.parent
_default_path = _api_root / "data" / "suppliers.json"
_raw_db_path = os.environ.get("SUPPLIERS_DB_PATH", str(_default_path))

# If the path is relative, resolve it relative to the API root (not CWD)
_db_path = Path(_raw_db_path)
if not _db_path.is_absolute():
    _db_path = _api_root / _db_path

_db_path.parent.mkdir(parents=True, exist_ok=True)

db = TinyDB(_db_path)

suppliers_table = db.table("suppliers")
users_table = db.table("users")
profiles_table = db.table("profiles")
password_resets_table = db.table("password_resets")
