"""Database clients: legacy TinyDB store and the SQLModel/Supabase engine.

users/profiles/password_reset_tokens/suppliers/incidents/records/
candidate_notes have all been migrated off TinyDB to SQL — see
app/models/*_storage.py and
supabase/migrations/20261106120000_create_users_profiles_tokens_suppliers_incidents_records.sql.
`get_tinydb()`/`TINYDB_PATH` are kept only for `migrate_tinydb_to_sql.py`
(the one-time migration script) to read the legacy `db.json` snapshot —
no application service reads or writes TinyDB anymore. Safe to remove
once that migration has run and been verified against the real database
(see migrate_tinydb_to_sql.py's own docstring for the exact sequence).
"""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine
from tinydb import TinyDB

from app.core.config import get_settings

settings = get_settings()

# Same db.json used across app/services/*.py and seed*.py
TINYDB_PATH = Path(__file__).resolve().parent.parent.parent / "db.json"


def get_tinydb() -> TinyDB:
    """Return a TinyDB client for the shared db.json file."""
    return TinyDB(TINYDB_PATH)


engine = create_engine(settings.DATABASE_URL, echo=settings.DEBUG)


def init_db() -> None:
    """Create any SQLModel tables that don't exist yet in Supabase."""
    # Imported here (not at module top) so every table=True model is
    # registered on SQLModel.metadata before create_all runs.
    from app.models import inbound, menu_item, outbound  # noqa: F401

    SQLModel.metadata.create_all(engine)
    _run_lightweight_migrations()


def _run_lightweight_migrations() -> None:
    """Add columns to tables that already existed before this field was
    introduced — `create_all()` only creates missing tables, it never
    alters existing ones. There is no formal migration tool (e.g. Alembic)
    in this project yet; these are small, additive-only, idempotent
    `ADD COLUMN IF NOT EXISTS` statements, safe to run on every startup.
    `minimum_stock` backfills to a flat default for every pre-existing
    product (a deliberate choice — see MenuItem.minimum_stock); `unit_cost`
    stays NULL for pre-existing deliveries since there is no real cost on
    file for them to backfill with.
    """
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE menu_items "
                "ADD COLUMN IF NOT EXISTS minimum_stock DOUBLE PRECISION NOT NULL DEFAULT 5"
            )
        )
        conn.execute(
            text("ALTER TABLE inbound_stock ADD COLUMN IF NOT EXISTS unit_cost DOUBLE PRECISION")
        )
        conn.execute(
            text("ALTER TABLE stock_exits ADD COLUMN IF NOT EXISTS unit_cost DOUBLE PRECISION")
        )


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a fresh SQLModel session per request.

    Use as `db: Session = Depends(get_db)`. Each call opens its own
    session against `engine`, closed once the request finishes.
    """
    with Session(engine) as session:
        yield session
