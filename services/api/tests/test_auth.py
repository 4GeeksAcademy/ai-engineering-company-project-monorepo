"""Auth checks: login, the JWT contents, token validation, and that no sensitive route is public."""

from __future__ import annotations

import base64
import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from jose import JWTError, jwt
from tinydb import TinyDB

from auth.security import create_access_token
from conftest import ALICE, BOB, PASSWORD, headers_for, uuid_of
from core.config import JWT_ALGORITHM, get_access_token_expire_minutes, get_jwt_secret
from main import app
from seed import seed_database
from suppliers import service as suppliers_service


@pytest.fixture()
def client(tmp_path, monkeypatch) -> TestClient:
    database = TinyDB(tmp_path / "suppliers-db.json")
    seed_database(database)
    monkeypatch.setattr(suppliers_service, "_db", database)
    yield TestClient(app)
    database.close()


def login(client, email=ALICE, password=PASSWORD, prefix=""):
    return client.post(f"{prefix}/auth/login", data={"username": email, "password": password})


# --- login -----------------------------------------------------------------


@pytest.mark.parametrize("prefix", ["", "/api"])
def test_login_returns_a_bearer_token_that_opens_me(client, prefix):
    response = login(client, prefix=prefix)
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    me = client.get(f"{prefix}/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json() == {"user_uuid": str(uuid_of(ALICE)), "email": ALICE}
    assert "password" not in me.text


def test_login_email_is_case_insensitive(client):
    assert login(client, "  ALICE@Example.com ").status_code == 200


def test_login_response_and_jwt_claims(client, users_db):
    body = login(client).json()
    assert set(body) == {"access_token", "token_type", "expires_in"}
    assert body["token_type"] == "bearer" and body["expires_in"] == 30 * 60  # default lifetime

    claims = jwt.decode(body["access_token"], get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    stored = next(doc for doc in users_db.all() if doc["email"] == ALICE)
    assert set(claims) == {"user_id", "exp"}  # minimum claims: no email, no password, no hash
    assert claims["user_id"] == stored["user_uuid"] == str(uuid_of(ALICE))
    assert claims["exp"] == pytest.approx(datetime.now(timezone.utc).timestamp() + body["expires_in"], abs=5)


def test_token_is_signed_with_hs256_and_the_secret_key(client):
    token = login(client).json()["access_token"]
    assert jwt.get_unverified_header(token)["alg"] == "HS256"
    with pytest.raises(JWTError):
        jwt.decode(token, "k" * 40, algorithms=[JWT_ALGORITHM])


@pytest.mark.parametrize("minutes,seconds", [("1", 60), ("120", 7200)])
def test_expiration_is_configurable(client, monkeypatch, minutes, seconds):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", minutes)
    body = login(client).json()
    claims = jwt.decode(body["access_token"], get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    assert body["expires_in"] == seconds
    assert claims["exp"] == pytest.approx(datetime.now(timezone.utc).timestamp() + seconds, abs=5)


@pytest.mark.parametrize("bad", ["0", "-5", "abc", "1.5"])
def test_invalid_expiration_setting_is_refused(monkeypatch, bad):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", bad)
    with pytest.raises(RuntimeError):
        get_access_token_expire_minutes()


def test_an_expired_token_is_rejected_by_the_real_clock(client, monkeypatch):
    monkeypatch.setattr("auth.security.get_access_token_expire_minutes", lambda: -1)
    headers = {"Authorization": f"Bearer {create_access_token(uuid_of(ALICE))}"}
    assert client.get("/suppliers", headers=headers).status_code == 401


@pytest.mark.parametrize(
    "email,password", [(ALICE, "wrong-password"), ("ghost@example.com", PASSWORD), (ALICE, "x" * 100), ("not-an-email", PASSWORD)]
)
def test_login_failures_are_a_uniform_401(client, email, password):
    response = login(client, email, password)
    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect email or password"}
    assert response.headers["www-authenticate"] == "Bearer"


# --- token validation ------------------------------------------------------


def _token(claims: dict, key: str | None = None, algorithm: str = JWT_ALGORITHM) -> dict[str, str]:
    return {"Authorization": f"Bearer {jwt.encode(claims, key or get_jwt_secret(), algorithm=algorithm)}"}


def _valid_claims(**overrides):
    return {"user_id": str(uuid_of(ALICE)), "exp": datetime.now(timezone.utc) + timedelta(minutes=5)} | overrides


def test_control_a_hand_made_valid_token_is_accepted(client):
    """Guards the cases below: they must fail because of the one thing they break."""
    assert client.get("/suppliers", headers=_token(_valid_claims())).status_code == 200


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer not-a-jwt"},
        {"Authorization": "Basic YWxpY2U6cGFzcw=="},
        _token(_valid_claims(exp=datetime.now(timezone.utc) - timedelta(seconds=1))),
        _token(_valid_claims(), key="k" * 40),  # signed with another key
        _token(_valid_claims(), algorithm="HS512"),  # algorithm not allowed
        _token({"user_id": str(uuid_of(ALICE))}),  # never expires
        _token({"exp": _valid_claims()["exp"]}),  # no user_id
        _token({"sub": str(uuid_of(ALICE)), "user_uuid": str(uuid_of(ALICE)), "exp": _valid_claims()["exp"]}),  # old claim names
        _token(_valid_claims(user_id=1)),  # not a string
        _token(_valid_claims(user_id="1")),  # not a uuid
        _token(_valid_claims(user_id=ALICE)),  # email instead of uuid
        _token(_valid_claims(user_id="0" * 32)),  # well-formed uuid, no such user
    ],
    ids=["missing", "garbage", "basic-scheme", "expired", "wrong-key", "wrong-alg", "no-exp",
         "no-user-id", "old-claim-names", "int-id", "not-a-uuid", "email-as-id", "unknown-user"],
)
def test_invalid_sessions_are_rejected_with_401(client, headers):
    response = client.get("/suppliers", headers=headers)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_unsigned_alg_none_token_is_rejected(client):
    def b64(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()

    uid = str(uuid_of(ALICE))
    forged = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'user_id': uid, 'exp': 4102444800})}."
    assert client.get("/suppliers", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_deleted_user_token_stops_working(client, users_db):
    headers = headers_for(BOB)
    assert client.get("/suppliers", headers=headers).status_code == 200
    users_db.remove(lambda d: d["email"] == BOB)
    assert client.get("/suppliers", headers=headers).status_code == 401


def test_changing_the_email_keeps_the_session(client, users_db):
    headers = headers_for(BOB)
    users_db.update({"email": "bob.new@example.com"}, lambda d: d["email"] == BOB)
    assert client.get("/auth/me", headers=headers).json()["email"] == "bob.new@example.com"


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
    uid = uuid_of(ALICE)
    calls = [
        ("get", "/suppliers"), ("get", "/api/suppliers"), ("get", "/suppliers/1"),
        ("get", "/suppliers/search/by-country?country=Spain"),
        ("get", "/suppliers/search/by-category?category=job_boards"),
        ("post", "/suppliers"), ("patch", "/suppliers/1"), ("patch", "/suppliers/1/rate"),
        ("patch", "/suppliers/1/status"), ("delete", "/suppliers/1"),
        ("get", "/api/suppliers/1"), ("post", "/api/suppliers"), ("delete", "/api/suppliers/1"),
        ("post", "/api/incidents/analyze"), ("get", "/api/incidents/results/export"),
        ("get", "/auth/me"), ("get", "/api/auth/me"),
        ("get", "/profiles"), ("get", "/profiles/me"), ("get", f"/profiles/{uid}"),
        ("patch", f"/profiles/{uid}"), ("get", "/api/profiles"), ("patch", f"/api/profiles/{uid}"),
        ("get", "/users"), ("post", "/users"), ("get", f"/users/{uid}"), ("patch", f"/users/{uid}"),
        ("delete", f"/users/{uid}"), ("get", "/api/users"), ("post", "/api/users"),
    ]
    for method, url in calls:
        assert getattr(client, method)(url).status_code == 401, (method, url)
    assert len(client.get("/suppliers", headers=headers_for(ALICE)).json()) == 15  # nothing was touched


def test_any_valid_session_can_use_the_suppliers_api(client):
    h = headers_for(BOB)
    assert client.get("/suppliers", headers=h).status_code == 200
    assert client.patch("/api/suppliers/1/rate", json={"monthly_rate": 5}, headers=h).status_code == 200


def test_health_and_docs_stay_public(client):
    assert client.get("/health").status_code == 200
    assert client.get("/openapi.json").status_code == 200
