import os
import sys
from pathlib import Path

import pytest

API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

# Fixed auth settings for tests; real environment values win over .env, so this
# never depends on (or touches) the developer's services/api/.env.
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
# In-memory SQLite stands in for Supabase: no test ever opens the real DATABASE_URL.
os.environ["DATABASE_URL"] = "sqlite://"

from fastapi.testclient import TestClient  # noqa: E402

import security  # noqa: E402

# Production uses bcrypt's default cost; 4 rounds keeps the suite fast.
security.bcrypt = security.bcrypt.using(rounds=4)

import database  # noqa: E402
import inventory_service  # noqa: E402
import main  # noqa: E402
from database import DB_PATH_ENV, INCIDENTS_DB_PATH_ENV, USERS_DB_PATH_ENV  # noqa: E402

PASSWORD = "correct-horse-1"


@pytest.fixture(autouse=True)
def fresh_sql_engine():
    """Each test gets its own empty in-memory inventory database."""
    database.get_engine.cache_clear()
    inventory_service.invalidate_caches()  # module-level cache: never leak one test's assets into the next
    yield
    database.get_engine.cache_clear()
    inventory_service.invalidate_caches()


@pytest.fixture()
def anon_client(tmp_path, monkeypatch):
    """API backed by temporary TinyDB files, with no credentials."""
    monkeypatch.setenv(DB_PATH_ENV, str(tmp_path / "suppliers.json"))
    monkeypatch.setenv(USERS_DB_PATH_ENV, str(tmp_path / "users.json"))
    monkeypatch.setenv(INCIDENTS_DB_PATH_ENV, str(tmp_path / "incidents.json"))
    with TestClient(main.app) as test_client:
        yield test_client


def register(client: TestClient, email: str, password: str = PASSWORD, **profile) -> dict:
    response = client.post("/users", json={"email": email, "password": password, **profile})
    assert response.status_code == 201, response.text
    return response.json()


def login(client: TestClient, email: str, password: str = PASSWORD) -> dict[str, str]:
    response = client.post("/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture()
def auth_client(anon_client):
    """Same API, with a registered user's bearer token sent on every request."""
    register(anon_client, "tester@nexova.example")
    anon_client.headers.update(login(anon_client, "tester@nexova.example"))
    return anon_client


# --- Unit-level fixtures: no HTTP, a repository of their own, Resend never reached ----------------

import uuid  # noqa: E402
from datetime import UTC, datetime, timedelta  # noqa: E402

import email_service  # noqa: E402
from jose import jwt  # noqa: E402

import security as security_module  # noqa: E402
from database import UserRepository  # noqa: E402
from user_models import Profile, Role, User  # noqa: E402

TEST_SECRET = os.environ["SECRET_KEY"]
TEST_ALGORITHM = os.environ["ALGORITHM"]


@pytest.fixture(autouse=True)
def resend_mock(monkeypatch):
    """No test reaches Resend or needs RESEND_API_KEY: `Emails.send` is replaced by a recorder.

    Returns the list of payloads "sent". Tests that need a failure patch `resend.Emails.send` again.
    """
    sent: list[dict] = []
    monkeypatch.setattr(email_service, "RESEND_API_KEY", "re_test_key_not_real")
    monkeypatch.setattr(email_service.resend.Emails, "send", staticmethod(lambda params: sent.append(params) or {"id": "x"}))
    return sent


@pytest.fixture()
def repo(tmp_path):
    """UserRepository on its own temporary TinyDB file (the real data/ files are never opened)."""
    repository = UserRepository(tmp_path / "users.json")
    yield repository
    repository.close()


@pytest.fixture()
def make_user(repo):
    """Factory: store a user (and a profile) directly in the repository, without going through the API."""

    def factory(email="user@nexova.example", password=PASSWORD, role=Role.USER, is_active=True, **profile) -> User:
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            hashed_password=security_module.hash_password(password),
            is_active=is_active,
            role=role,
            created_at=datetime.now(UTC),
        )
        repo.create_user_with_profile(user, Profile(id=str(uuid.uuid4()), user_id=user.id, **profile))
        return user

    return factory


@pytest.fixture()
def user(make_user):
    return make_user("user@nexova.example")


@pytest.fixture()
def admin(make_user):
    return make_user("admin@nexova.example", role=Role.ADMIN)


@pytest.fixture()
def inactive_user(make_user):
    return make_user("inactive@nexova.example", is_active=False)


@pytest.fixture()
def make_token():
    """Factory for JWTs signed like the API's, with any claim overridable or removable (value `None` drops it)."""

    def factory(sub: str = "some-user-id", *, type: str | None = "access", expires_in=timedelta(minutes=30), key=TEST_SECRET, algorithm=TEST_ALGORITHM, **extra) -> str:
        claims: dict = {"sub": sub, "type": type, "exp": datetime.now(UTC) + expires_in, **extra}
        claims = {name: value for name, value in claims.items() if value is not None}
        return jwt.encode(claims, key, algorithm=algorithm)

    return factory
