"""pytest configuration and shared fixtures for auth module tests.

Sets up a clean TinyDB in a temporary directory and provides fixtures
for user creation and JWT generation — all without FastAPI TestClient.
"""

from __future__ import annotations

import os
import shutil
import tempfile

import pytest

# ──────────────────────────────────────────────────────────────
# Session-level environment bootstrap (runs before ANY import)
# ──────────────────────────────────────────────────────────────
# We use a module-level variable + pytest_configure so that env
# vars are available when src.database reads them at import time.
_TEST_DIR: str = tempfile.mkdtemp(prefix="trackflow_tests_")

os.environ.setdefault("TINYDB_PATH", os.path.join(_TEST_DIR, "test_db.json"))
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-purposes")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")


def pytest_configure(config: pytest.Config) -> None:
    """One-time session setup: ensure env vars are locked before any imports."""
    os.environ.setdefault("TINYDB_PATH", os.path.join(_TEST_DIR, "test_db.json"))
    os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-purposes")
    os.environ.setdefault("ALGORITHM", "HS256")
    os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")


def pytest_unconfigure(config: pytest.Config) -> None:
    """Cleanup the temporary test directory after the session ends."""
    shutil.rmtree(_TEST_DIR, ignore_errors=True)


# ------------------------------------------------------------------
# Fixtures — session-scoped to keep TinyDB alive across tests
# ------------------------------------------------------------------


@pytest.fixture(scope="session")
def fresh_db():
    """Ensure the test DB is clean before the session starts.

    The DB path is already set via os.environ["TINYDB_PATH"].  We
    just delete any leftover file so every session starts empty.
    """
    db_path = os.environ["TINYDB_PATH"]
    if os.path.isfile(db_path):
        os.remove(db_path)
    # Import modules now that env vars are frozen
    from src.database import (
        db,
        get_users_table,
        get_profiles_table,
        get_products_table,
        get_stock_movements_table,
        get_stock_reservations_table,
        get_carriers_table,
        get_carrier_assignments_table,
    )

    # Wipe all tables to guarantee clean state
    get_users_table().truncate()
    get_profiles_table().truncate()
    get_products_table().truncate()
    get_stock_movements_table().truncate()
    get_stock_reservations_table().truncate()
    get_carriers_table().truncate()
    get_carrier_assignments_table().truncate()

    return db

# ------------------------------------------------------------------
# Function-scoped fixtures — each test gets isolated data
# ------------------------------------------------------------------


@pytest.fixture
def test_user(fresh_db):
    """Create and return a test user stored in the ephemeral TinyDB.

    Uses yield-fixture pattern to clean up after each test.
    Returns a tuple of (user_service.User, raw_plain_password).
    """
    from src.database import get_users_table, get_profiles_table
    from src.services.user_service import create_user

    user = create_user(
        email="qa@trackflow.io",
        password="Str0ng!Pass",
        name="QA Engineer",
        phone="+34900000000",
        address="Calle Test 42",
    )
    yield user, "Str0ng!Pass"

    # Teardown: remove user and linked profile by doc_id
    users_table = get_users_table()
    profiles_table = get_profiles_table()
    from tinydb import Query
    profile_query = Query()
    profiles_table.remove(profile_query.user_id == user.id)
    users_table.remove(doc_ids=[user.id])


@pytest.fixture
def test_admin_user(fresh_db):
    """Create and return an admin test user (also cleans up)."""
    from src.database import get_users_table
    from src.services.user_service import create_user

    user = create_user(
        email="admin@trackflow.io",
        password="Admin!2025",
        role="admin",
        name="Admin User",
    )
    yield user, "Admin!2025"

    get_users_table().remove(doc_ids=[user.id])


@pytest.fixture
def auth_token(test_user):
    """Return a valid JWT for the test user."""
    from src.services.auth_service import create_access_token

    user, _ = test_user
    return create_access_token(user.id)


@pytest.fixture
def expired_token(test_user):
    """Return a JWT that is already expired for the test user."""
    from datetime import datetime, timedelta, timezone

    from jose import jwt

    from src.services.auth_service import _get_secret_key, _get_algorithm

    user, _ = test_user
    payload = {
        "sub": str(user.id),
        "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
    }
    return jwt.encode(payload, _get_secret_key(), algorithm=_get_algorithm())


@pytest.fixture
def tampered_token(auth_token):
    """Return a token whose signature has been corrupted."""
    parts = auth_token.split(".")
    # Corrupt the payload segment
    return f"{parts[0]}.corrupted.{parts[2]}"


@pytest.fixture
def token_with_missing_sub(test_user):
    """Return a properly signed token that lacks the 'sub' claim."""
    from datetime import datetime, timedelta, timezone

    from jose import jwt

    from src.services.auth_service import _get_secret_key, _get_algorithm

    payload = {
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    return jwt.encode(payload, _get_secret_key(), algorithm=_get_algorithm())


# ------------------------------------------------------------------
# Function-scoped isolation for inventory & carrier tests
# ------------------------------------------------------------------


@pytest.fixture
def clean_logistics_db(fresh_db):
    """Function-scoped fixture that truncates inventory and carrier tables
    before each test, guaranteeing isolation for tests that expect empty state."""
    from src.database import (
        get_products_table,
        get_stock_movements_table,
        get_stock_reservations_table,
        get_carriers_table,
        get_carrier_assignments_table,
    )
    get_products_table().truncate()
    get_stock_movements_table().truncate()
    get_stock_reservations_table().truncate()
    get_carriers_table().truncate()
    get_carrier_assignments_table().truncate()
    return fresh_db


# ------------------------------------------------------------------
# Inventory fixtures
# ------------------------------------------------------------------


@pytest.fixture
def sample_product(clean_logistics_db):
    """Create and return a test product stored in TinyDB (cleaned up after test)."""
    from tinydb import Query
    from src.database import get_products_table
    from src.models.inventory import ProductCreate, ProductCategory, WarehouseLocation
    from src.services.inventory_service import create_product

    payload = ProductCreate(
        nombre="Laptop Pro",
        sku="LAP-001",
        descripcion="Laptop de prueba",
        cantidad=50,
        precio=1200.00,
        categoria=ProductCategory.ELECTRONICA,
        ubicacion=WarehouseLocation.CENTRAL,
        stock_minimo=10,
    )
    product = create_product(payload)
    yield product

    query = Query()
    get_products_table().remove(query.id == product.id)


@pytest.fixture
def low_stock_product(clean_logistics_db):
    """Create a product with stock below the minimum threshold."""
    from tinydb import Query
    from src.database import get_products_table
    from src.models.inventory import ProductCreate, ProductCategory, WarehouseLocation
    from src.services.inventory_service import create_product

    payload = ProductCreate(
        nombre="Cable USB",
        sku="CBL-001",
        cantidad=3,
        precio=5.00,
        categoria=ProductCategory.ELECTRONICA,
        ubicacion=WarehouseLocation.ZARAGOZA,
        stock_minimo=10,
    )
    product = create_product(payload)
    yield product

    query = Query()
    get_products_table().remove(query.id == product.id)


# ------------------------------------------------------------------
# Carrier fixtures
# ------------------------------------------------------------------


@pytest.fixture
def sample_carrier(clean_logistics_db):
    """Create and return a test carrier stored in TinyDB (cleaned up after test)."""
    from tinydb import Query
    from src.database import get_carriers_table
    from src.models.carrier import Carrier, CarrierStatus
    from src.services.carrier_service import create_carrier

    carrier = Carrier(
        nombre="Transportes Rápidos",
        tarifa_kg=5.0,
        capacidad_kg=1000.0,
        peso_actual_kg=0.0,
        estado=CarrierStatus.DISPONIBLE,
        regiones=["Madrid", "Barcelona", "Zaragoza"],
    )
    created = create_carrier(carrier)
    yield created

    query = Query()
    get_carriers_table().remove(query.id == created.id)


@pytest.fixture
def full_carrier(clean_logistics_db):
    """Create a carrier that is already at full capacity."""
    from tinydb import Query
    from src.database import get_carriers_table
    from src.models.carrier import Carrier, CarrierStatus
    from src.services.carrier_service import create_carrier

    carrier = Carrier(
        nombre="Transportes Llenos",
        tarifa_kg=8.0,
        capacidad_kg=100.0,
        peso_actual_kg=100.0,
        estado=CarrierStatus.DISPONIBLE,
        regiones=["Madrid"],
    )
    created = create_carrier(carrier)
    yield created

    query = Query()
    get_carriers_table().remove(query.id == created.id)


@pytest.fixture
def inactive_carrier(clean_logistics_db):
    """Create a carrier that is not available for assignments."""
    from tinydb import Query
    from src.database import get_carriers_table
    from src.models.carrier import Carrier, CarrierStatus
    from src.services.carrier_service import create_carrier

    carrier = Carrier(
        nombre="Transportes Inactivos",
        tarifa_kg=3.0,
        capacidad_kg=500.0,
        peso_actual_kg=0.0,
        estado=CarrierStatus.INACTIVO,
        regiones=["Sevilla"],
    )
    created = create_carrier(carrier)
    yield created

    query = Query()
    get_carriers_table().remove(query.id == created.id)