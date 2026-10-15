"""Shared auth fixtures: an isolated user store with three users."""

from __future__ import annotations

import os
import time
import base64
import json
from datetime import datetime, timedelta
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from jose import jwt
from tinydb import TinyDB

from auth.security import create_access_token, hash_password
from core.config import JWT_ALGORITHM, get_jwt_secret
from profiles import service as profiles_service
from profiles.schemas import Profile
from users import service as users_service
from users.schemas import Role, User

PASSWORD = "correct-horse-battery"
ALICE, BOB, CAROL = "alice@example.com", "bob@example.com", "carol@example.com"
UUIDS = {email: uuid4() for email in (ALICE, BOB, CAROL)}

# bcrypt is deliberately slow: hash once per session, reuse in every test.
_PASSWORD_HASH = hash_password(PASSWORD)


@pytest.fixture(autouse=True)
def users_db(tmp_path, monkeypatch) -> TinyDB:
    """Fresh users (alice, bob, carol) per test, never the real users/db.json."""
    database = TinyDB(tmp_path / "users-db.json")
    for email, user_uuid in UUIDS.items():
        user = User(id=user_uuid, email=email, hashed_password=_PASSWORD_HASH, role=Role.admin if email == ALICE else Role.user)
        database.insert(user.model_dump(mode="json"))
    monkeypatch.setattr(users_service, "_db", database)
    yield database
    database.close()


@pytest.fixture(autouse=True)
def profiles_db(tmp_path, monkeypatch) -> TinyDB:
    """One profile per seeded user, as the app has after startup (default name =
    the local part of the email)."""
    database = TinyDB(tmp_path / "profiles-db.json")
    for email, user_uuid in UUIDS.items():
        database.insert(Profile(user_id=user_uuid, name=email.split("@")[0]).model_dump(mode="json"))
    monkeypatch.setattr(profiles_service, "_db", database)
    yield database
    database.close()


def uuid_of(email: str) -> UUID:
    return UUIDS[email]


def headers_for(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(uuid_of(email))}"}


FAR_FUTURE = 4102444800  # year 2100: "not expired" without depending on when the tests run


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def signed_token(claims: dict, key: str | None = None, algorithm: str = JWT_ALGORITHM) -> str:
    """A JWT with exactly these claims, signed with the app's secret unless told otherwise."""
    return jwt.encode(claims, key or get_jwt_secret(), algorithm=algorithm)


def jwt_segment(data: dict) -> str:
    """One base64url JWT segment (header or payload), for building forged tokens by hand."""
    return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()


def jwt_payload(segment: str) -> dict:
    return json.loads(base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4)))


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    return headers_for(ALICE)


@pytest.fixture()
def clock(monkeypatch):
    """``clock(seconds)``: from now on the JWT library validates ``exp``/``nbf`` as if ``seconds``
    had passed. Lets a test cross a token's real expiry instant without sleeping. Only the
    validation side moves: tokens are still issued with the real clock."""
    offset = {"seconds": 0}

    class _Meta(type):
        def __instancecheck__(cls, obj):  # jose also uses ``datetime`` for isinstance checks
            return isinstance(obj, datetime)

    class _ShiftedDatetime(metaclass=_Meta):
        @staticmethod
        def now(tz=None):
            return datetime.now(tz) + timedelta(seconds=offset["seconds"])

    monkeypatch.setattr("jose.jwt.datetime", _ShiftedDatetime)

    def travel(seconds: float) -> None:
        offset["seconds"] = seconds

    return travel


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    """Async tests (``pytestmark = pytest.mark.anyio``) run on asyncio only."""
    return "asyncio"


@pytest.fixture()
async def async_client():
    """``httpx.AsyncClient`` wired straight to the ASGI app (no network, no lifespan). Use it with the
    ``users_db`` / ``profiles_db`` fixtures, which already isolate the stores."""
    from main import app  # imported here so conftest has no import-time side effects

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        yield client


@pytest.fixture()
def tokyo_timezone():
    """The server's local timezone is not UTC: ``exp`` is an absolute instant and must not care."""
    if not hasattr(time, "tzset"):
        pytest.skip("time.tzset is not available on this platform")
    previous = os.environ.get("TZ")
    os.environ["TZ"] = "JST-9"  # POSIX spelling of UTC+9, needs no tz database
    time.tzset()
    yield
    if previous is None:
        os.environ.pop("TZ", None)
    else:
        os.environ["TZ"] = previous
    time.tzset()


@pytest.fixture()
def frozen_clock(monkeypatch):
    """``frozen_clock(timestamp)``: the JWT library validates as if "now" were exactly this POSIX second. For the
    exact edges of ``exp`` / ``nbf``, where the moving ``clock`` fixture is too coarse."""
    now = {"timestamp": 0}

    class _Meta(type):
        def __instancecheck__(cls, obj):
            return isinstance(obj, datetime)

    class _FrozenDatetime(metaclass=_Meta):
        @staticmethod
        def now(tz=None):
            return datetime.fromtimestamp(now["timestamp"], tz)

    monkeypatch.setattr("jose.jwt.datetime", _FrozenDatetime)

    def freeze(timestamp: int) -> None:
        now["timestamp"] = timestamp

    return freeze


@pytest.fixture()
async def authed_client():
    """An ``httpx.AsyncClient`` already logged in as alice (an admin): for the groups of endpoints whose business rules
    are the point of the test, not the session. Use ``async_client`` when the test is about having no session."""
    from main import app  # imported here so conftest has no import-time side effects

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver", headers=headers_for(ALICE)
    ) as client:
        yield client


@pytest.fixture()
def suppliers_db(tmp_path, monkeypatch) -> TinyDB:
    """The 15 seeded suppliers (ids 1 to 15: 8 in Spain, 7 in the USA; Greenhouse and Coursera are suspended) in an isolated
    store, never the real ``suppliers/db.json``."""
    from seed import seed_database
    from suppliers import service as suppliers_service

    database = TinyDB(tmp_path / "suppliers-db.json")
    seed_database(database)
    monkeypatch.setattr(suppliers_service, "_db", database)
    yield database
    database.close()

