"""Shared pytest fixtures for SQL-backed tests.

Replaces the per-test-file `_patch_db_path` + raw-TinyDB-seeding pattern
that existed before the TinyDB -> SQL migration (one independent fixture
per file, each pointing a handful of `_DB_PATH` module attributes at a
throwaway JSON file — see git history of test_route_protection.py,
test_auth.py, test_suppliers.py, test_profiles.py, test_users.py for the
old pattern).

Every entity migrated off TinyDB (users, profiles, password_reset_tokens,
suppliers, incidents, records, candidate_notes) now lives in a module
that opens its own `Session(engine)` per call (see
app/services/users.py's docstring for why) — so the equivalent of
"point this module at a test database" is monkeypatching that module's
bound `engine` name, the same way `_DB_PATH` used to be monkeypatched one
module at a time.

The `sql_engine` fixture gives every test function a fresh, isolated
in-memory SQLite database (StaticPool keeps the same `:memory:` database
across the multiple connections a test may open) with every relevant
table created — a real round-trip (DDL + CRUD), not a MagicMock, which is
a strictly better test than the pre-migration suite had for these
entities. Foreign keys are enforced (SQLite doesn't do this by default)
so the retrofitted FKs on inbound_stock/stock_exits are actually
exercised.
"""

from __future__ import annotations

import pytest
from sqlalchemy import event
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.core.database import get_db
from app.main import app
from app.models import candidate_storage, incident_storage, password_reset_token_storage, profile_storage, supplier_storage, user_storage

# Modules whose module-level `engine` name must point at the test engine
# for the duration of each test (each opens its own `Session(engine)` per
# call — see their shared docstring convention).
_SERVICE_MODULES_WITH_OWN_ENGINE = [
    "app.services.users",
    "app.services.profiles",
    "app.services.password_resets",
    "app.services.suppliers",
    "app.services.incidents",
    "app.services.records",
]

# Metadata objects for the 7 migrated entities (plain Core Table modules,
# each on its own MetaData — see their shared docstring convention).
_MIGRATED_ENTITY_METADATAS = [
    user_storage.metadata,
    profile_storage.metadata,
    password_reset_token_storage.metadata,
    supplier_storage.metadata,
    incident_storage.metadata,
    candidate_storage.metadata,
]


@pytest.fixture
def sql_engine(monkeypatch):
    """A fresh in-memory SQLite engine with every relevant table created,
    wired up as the engine every SQL-backed service/route uses for the
    duration of one test function.
    """
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(test_engine, "connect")
    def _enable_sqlite_fk(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Create the 7 migrated entities FIRST: inbound_stock/stock_exits'
    # FK columns (user_uuid/supplier_id) are built from explicit Column
    # object references to users_table/suppliers_table (see
    # inbound.py/outbound.py's comments) — users/suppliers must already
    # exist for SQLModel.metadata.create_all() below to succeed.
    for metadata in _MIGRATED_ENTITY_METADATAS:
        metadata.create_all(test_engine)
    # SQLModel.metadata: menu_items/inbound_stock/stock_exits/telemetry
    # tables that happen to be registered on it by whatever's been
    # imported so far.
    SQLModel.metadata.create_all(test_engine)

    for module_path in _SERVICE_MODULES_WITH_OWN_ENGINE:
        monkeypatch.setattr(f"{module_path}.engine", test_engine)

    def _override_get_db():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db
    yield test_engine
    app.dependency_overrides.pop(get_db, None)
    test_engine.dispose()


# NOT autouse globally — other test files (test_telemetry*.py) already
# define their own `get_db` override with a MagicMock session and must
# not be affected by this one. Each of the 7 migrated-entity test files
# opts in explicitly with, at module level:
#     pytestmark = pytest.mark.usefixtures("sql_engine")
