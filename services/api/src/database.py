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
users_table = db.table("users")
profiles_table = db.table("profiles")
incidents_table = db.table("incidents")
products_table = db.table("products")
stock_movements_table = db.table("stock_movements")
stock_reservations_table = db.table("stock_reservations")
carriers_table = db.table("carriers")
carrier_assignments_table = db.table("carrier_assignments")


def get_db() -> TinyDB:
    """Return the TinyDB client instance."""

    return db


def get_suppliers_table() -> Table:
    """Return the suppliers table handle."""

    return suppliers_table


def get_users_table() -> Table:
    """Return the users table handle."""

    return users_table


def get_profiles_table() -> Table:
    """Return the profiles table handle."""

    return profiles_table


def get_incidents_table() -> Table:
    """Return the incidents table handle."""

    return incidents_table


def get_products_table() -> Table:
    """Return the products (inventory) table handle."""

    return products_table


def get_stock_movements_table() -> Table:
    """Return the stock movements ledger table handle."""

    return stock_movements_table


def get_stock_reservations_table() -> Table:
    """Return the stock reservations table handle."""

    return stock_reservations_table


def get_carriers_table() -> Table:
    """Return the carriers table handle."""

    return carriers_table


def get_carrier_assignments_table() -> Table:
    """Return the carrier assignments table handle."""

    return carrier_assignments_table
