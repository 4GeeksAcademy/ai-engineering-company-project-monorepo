"""Auth checks: login, token validation, roles, and that no sensitive route is public."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from tinydb import TinyDB

from auth import service as auth_service
from auth.security import create_access_token
from core.config import JWT_ALGORITHM, get_jwt_secret
from main import app
from seed import seed_database
from suppliers import service as suppliers_service

from conftest import PASSWORD, headers_for

NEW_SUPPLIER = {
    "name": "Proveedor Auth",
    "country": "Spain",
    "categories": ["job_boards"],
    "monthly_rate": 10,
    "currency": "EUR",
    "status": "active",
}


@pytest.fixture()
def client(tmp_path, monkeypatch) -> TestClient:
    database = TinyDB(tmp_path / "suppliers-db.json")
    seed_database(database)
    monkeypatch.setattr(suppliers_service, "_db", database)
    yield TestClient(app)
    database.close()


def login(client, username="admin", password=PASSWORD, prefix=""):
    return client.post(f"{prefix}/auth/login", data={"username": username, "password": password})


# --- login -----------------------------------------------------------------


@pytest.mark.parametrize("prefix", ["", "/api"])
def test_login_returns_a_bearer_token_that_opens_me(client, prefix):
    response = login(client, prefix=prefix)
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    me = client.get(f"{prefix}/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json() == {"username": "admin", "role": "admin", "disabled": False}
    assert "password" not in me.text


@pytest.mark.parametrize(
    "username,password", [("admin", "wrong-password"), ("ghost", PASSWORD), ("admin", "x" * 100)]
)
def test_login_failures_are_a_uniform_401(client, username, password):
    response = login(client, username, password)
    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect username or password"}
    assert response.headers["www-authenticate"] == "Bearer"


def test_disabled_user_cannot_log_in_or_use_an_existing_token(client, auth_db):
    token_headers = headers_for("supervisor")
    auth_db.update({"disabled": True}, lambda d: d["username"] == "supervisor")
    assert login(client, "supervisor").status_code == 401
    assert client.get("/suppliers", headers=token_headers).status_code == 401


# --- token validation ------------------------------------------------------


def _token(claims: dict, key: str | None = None, algorithm: str = JWT_ALGORITHM) -> dict[str, str]:
    return {"Authorization": f"Bearer {jwt.encode(claims, key or get_jwt_secret(), algorithm=algorithm)}"}


def _valid_claims(**overrides):
    now = datetime.now(timezone.utc)
    return {"sub": "admin", "iat": now, "exp": now + timedelta(minutes=5)} | overrides


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer not-a-jwt"},
        {"Authorization": "Basic YWRtaW46cGFzcw=="},
        _token(_valid_claims(exp=datetime.now(timezone.utc) - timedelta(seconds=1))),
        _token(_valid_claims(), key="k" * 40),  # signed with another key
        _token(_valid_claims(), algorithm="HS512"),  # algorithm not allowed
        _token({k: v for k, v in _valid_claims().items() if k != "exp"}),  # never expires
        _token(_valid_claims(sub="ghost")),  # user no longer exists
    ],
    ids=["missing", "garbage", "basic-scheme", "expired", "wrong-key", "wrong-alg", "no-exp", "unknown-user"],
)
def test_invalid_sessions_are_rejected_with_401(client, headers):
    response = client.get("/suppliers", headers=headers)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_unsigned_alg_none_token_is_rejected(client):
    import base64, json

    def b64(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()

    forged = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'sub': 'admin', 'exp': 4102444800})}."
    assert client.get("/suppliers", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


# --- roles -----------------------------------------------------------------


@pytest.mark.parametrize("role", ["consultant", "supervisor", "admin"])
def test_any_role_can_read(client, role):
    assert client.get("/suppliers", headers=headers_for(role)).status_code == 200
    assert client.get("/api/suppliers/1", headers=headers_for(role)).status_code == 200


@pytest.mark.parametrize(
    "role,expected", [("consultant", 403), ("supervisor", 201), ("admin", 201)]
)
def test_only_supervisors_and_admins_can_create(client, role, expected):
    assert client.post("/suppliers", json=NEW_SUPPLIER, headers=headers_for(role)).status_code == expected


@pytest.mark.parametrize("role,expected", [("consultant", 403), ("supervisor", 200), ("admin", 200)])
def test_only_supervisors_and_admins_can_modify(client, role, expected):
    h = headers_for(role)
    assert client.patch("/suppliers/1", json={"notes": "x"}, headers=h).status_code == expected
    assert client.patch("/suppliers/1/rate", json={"monthly_rate": 5}, headers=h).status_code == expected
    assert client.patch("/suppliers/1/status", json={"status": "active"}, headers=h).status_code == expected


@pytest.mark.parametrize("role,expected", [("consultant", 403), ("supervisor", 403), ("admin", 204)])
def test_only_admins_can_delete(client, role, expected):
    assert client.delete("/suppliers/1", headers=headers_for(role)).status_code == expected


def test_a_forbidden_write_does_not_change_data(client):
    before = client.get("/suppliers/1", headers=headers_for("admin")).json()
    client.patch("/suppliers/1/rate", json={"monthly_rate": 1}, headers=headers_for("consultant"))
    assert client.get("/suppliers/1", headers=headers_for("admin")).json() == before


def test_role_change_applies_to_existing_tokens(client, auth_db):
    headers = headers_for("supervisor")
    assert client.post("/suppliers", json=NEW_SUPPLIER, headers=headers).status_code == 201
    auth_db.update({"role": "consultant"}, lambda d: d["username"] == "supervisor")
    assert client.post("/suppliers", json=NEW_SUPPLIER, headers=headers).status_code == 403


# --- user management ---------------------------------------------------------


def test_admin_creates_a_user_who_can_then_log_in(client):
    payload = {"username": "  Nuevo.Usuario ", "password": "s3cret-pass!", "role": "consultant"}
    created = client.post("/auth/users", json=payload, headers=headers_for("admin"))
    assert created.status_code == 201
    assert created.json() == {"username": "nuevo.usuario", "role": "consultant", "disabled": False}
    assert login(client, "NUEVO.usuario", "s3cret-pass!").status_code == 200
    stored = auth_service.get_user("nuevo.usuario")
    assert stored["password_hash"].startswith("$2") and "s3cret-pass!" not in str(stored)


def test_creating_users_is_admin_only_and_rejects_duplicates_and_bad_input(client):
    ok = {"username": "otro", "password": "s3cret-pass!", "role": "consultant"}
    assert client.post("/auth/users", json=ok).status_code == 401
    assert client.post("/auth/users", json=ok, headers=headers_for("supervisor")).status_code == 403
    assert client.post("/auth/users", json={**ok, "username": "admin"}, headers=headers_for("admin")).status_code == 409
    for bad in ({"password": "short"}, {"role": "root"}, {"password": "é" * 40}, {"username": "a b"}):
        assert client.post("/auth/users", json={**ok, **bad}, headers=headers_for("admin")).status_code == 422


def test_bootstrap_admin_only_runs_on_an_empty_store(tmp_path, monkeypatch, auth_db):
    monkeypatch.setenv("AUTH_ADMIN_PASSWORD", "bootstrap-pass")
    auth_service.bootstrap_admin()  # store already has users: no-op
    assert len(auth_db) == 3

    empty = TinyDB(tmp_path / "empty.json")
    monkeypatch.setattr(auth_service, "_db", empty)
    auth_service.bootstrap_admin()
    assert auth_service.authenticate("admin", "bootstrap-pass")["role"] == "admin"
    empty.close()


def test_bootstrap_without_password_creates_nobody(tmp_path, monkeypatch):
    empty = TinyDB(tmp_path / "empty.json")
    monkeypatch.setattr(auth_service, "_db", empty)
    monkeypatch.delenv("AUTH_ADMIN_PASSWORD", raising=False)
    auth_service.bootstrap_admin()
    assert len(empty) == 0
    empty.close()


# --- nothing sensitive is public ---------------------------------------------

PUBLIC = {
    ("post", "/auth/login"),
    ("get", "/health"),
}


def test_every_documented_operation_requires_a_session_except_the_public_allowlist():
    """Guards against a future route or router being added without protection.

    Works from the OpenAPI schema (public API, stable across FastAPI versions):
    an operation depending on ``get_current_user`` declares an OAuth2 ``security``
    requirement. The undocumented ``/api/*`` mounts reuse the same routers, and
    are covered by the explicit 401 checks below.
    """
    operations = {
        (method, path): operation
        for path, item in app.openapi()["paths"].items()
        for method, operation in item.items()
    }
    assert len(operations) > 10  # the walk must actually see the routes
    assert PUBLIC <= operations.keys()
    exposed = [key for key, op in operations.items() if key not in PUBLIC and not op.get("security")]
    assert exposed == []


def test_sensitive_routes_answer_401_without_a_token(client):
    calls = [
        ("get", "/suppliers"), ("get", "/api/suppliers"), ("get", "/suppliers/1"),
        ("get", "/suppliers/search/by-country?country=Spain"),
        ("get", "/suppliers/search/by-category?category=job_boards"),
        ("post", "/suppliers"), ("patch", "/suppliers/1"), ("patch", "/suppliers/1/rate"),
        ("patch", "/suppliers/1/status"), ("delete", "/suppliers/1"),
        ("post", "/api/incidents/analyze"), ("get", "/api/incidents/results/export"),
        ("get", "/auth/me"), ("post", "/auth/users"), ("get", "/api/auth/me"),
        ("get", "/api/suppliers/1"), ("post", "/api/suppliers"), ("delete", "/api/suppliers/1"),
    ]
    for method, url in calls:
        assert getattr(client, method)(url).status_code == 401, (method, url)
    assert len(client.get("/suppliers", headers=headers_for("admin")).json()) == 15  # nothing was touched


def test_health_and_docs_stay_public(client):
    assert client.get("/health").status_code == 200
    assert client.get("/openapi.json").status_code == 200
