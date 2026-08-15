"""Database layer: TinyDB (local auth) + SQLModel (Supabase PostgreSQL).

TinyDB is kept for lightweight local authentication data.
The SQLModel engine connects to Supabase PostgreSQL for the inventory system.
"""

from __future__ import annotations

import os
from collections.abc import Generator
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine
from tinydb import TinyDB
from tinydb.table import Table

# ── Local paths ──────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "data" / "suppliers.json"
DB_PATH = Path(os.getenv("TINYDB_PATH", str(DEFAULT_DB_PATH)))

# Ensure the destination directory exists before TinyDB opens the file.
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────
# TinyDB – used for authentication and simple local persistence
# ─────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────
# SQLModel / Supabase (PostgreSQL)
# ─────────────────────────────────────────────────────────────────────────

_SQL_URL: str | None = os.getenv("SQL_URL")
if not _SQL_URL:
    raise RuntimeError(
        "La variable de entorno SQL_URL es obligatoria para conectar con "
        "Supabase PostgreSQL. Defínela en el archivo .env"
    )

engine = create_engine(_SQL_URL, echo=False)


def init_db() -> None:
    """Create all SQLModel tables in Supabase if they don't exist yet.

    Call this once during application startup (e.g. inside a FastAPI
    ``lifespan`` context manager).
    """
    # The import registers the table models with SQLModel.metadata.
    from src.models.sql_models import (  # noqa: F401
        IncidentTable,
        ProfileTable,
        SupplierTable,
        UserTable,
    )

    SQLModel.metadata.create_all(engine)


def get_sql_session() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a **new** SQLModel session per request.

    The session is automatically closed when the request finishes.
    Use it as a dependency on your route handlers::

        from fastapi import Depends
        from sqlmodel import Session

        @router.get("/items")
        def list_items(db: Session = Depends(get_sql_session)):
            ...

    No global session variables are used — each request gets its own
    isolated session.
    """
    with Session(engine) as session:
        yield session
