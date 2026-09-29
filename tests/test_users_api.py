import bcrypt
import pytest
from fastapi.testclient import TestClient
from jose import jwt

from ai_engineering_company_project_monorepo.api.main import app
from ai_engineering_company_project_monorepo.models.user import UserRole
from ai_engineering_company_project_monorepo.services.profile_service import (
    create_profile,
    get_profile_by_user_id,
)
from ai_engineering_company_project_monorepo.services.user_service import (
    create_user,
    get_user_by_email,
    get_user_by_id,
)


JWT_SECRET = "test-secret-key"


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch, tmp_path):
    monkeypatch.setenv("JWT_SECRET_KEY", JWT_SECRET)
    monkeypatch.setenv("TINYDB_PATH", str(tmp_path / "users.json"))
    with TestClient(app) as test_client:
        yield test_client


def auth_headers(user_id: str) -> dict[str, str]:
    token = jwt.encode({"sub": user_id}, JWT_SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def test_register_hashes_password_and_creates_profile(client: TestClient) -> None:
    response = client.post(
        "/users",
        json={
            "email": "new@example.com",
            "password": "a-secure-password",
            "name": "New User",
            "phone": "+1 555 0100",
            "address": "1 Main Street",
        },
    )

    assert response.status_code == 201
    assert "hashed_password" not in response.json()
    assert response.json()["role"] == UserRole.USER.value

    database = client.app.state.database
    user = get_user_by_email(database, "new@example.com")
    assert user is not None
    assert bcrypt.checkpw(b"a-secure-password", user.hashed_password.encode("ascii"))
    profile = get_profile_by_user_id(database, user.id)
    assert profile is not None
    assert profile.id
    assert profile.user_id == user.id
    assert (profile.name, profile.phone, profile.address) == (
        "New User",
        "+1 555 0100",
        "1 Main Street",
    )
    assert response.json()["profile"]["id"] == profile.id


def test_user_reads_require_authentication_and_update_permissions(client: TestClient) -> None:
    database = client.app.state.database
    member = create_user(database, email="member@example.com", hashed_password="hash")
    target = create_user(database, email="target@example.com", hashed_password="hash")
    admin = create_user(
        database,
        email="admin@example.com",
        hashed_password="hash",
        role=UserRole.ADMIN.value,
    )

    assert client.get("/users").status_code == 401
    headers = auth_headers(member.id)
    assert client.get("/users", headers=headers).status_code == 403
    assert client.get("/users", headers=auth_headers(admin.id)).status_code == 200
    assert client.get(f"/users/{target.id}", headers=headers).status_code == 403
    assert client.get(f"/users/{target.id}", headers=auth_headers(admin.id)).status_code == 200

    self_update = client.put(
        f"/users/{member.id}",
        headers=headers,
        json={"email": "member-updated@example.com", "password": "another-secure-password"},
    )
    assert self_update.status_code == 200
    assert "hashed_password" not in self_update.json()
    updated_member = get_user_by_id(database, member.id)
    assert updated_member is not None
    assert bcrypt.checkpw(
        b"another-secure-password",
        updated_member.hashed_password.encode("ascii"),
    )

    assert client.put(
        f"/users/{member.id}",
        headers=headers,
        json={"role": "admin"},
    ).status_code == 403
    assert client.put(
        f"/users/{target.id}",
        headers=headers,
        json={"email": "stolen@example.com"},
    ).status_code == 403

    admin_update = client.put(
        f"/users/{target.id}",
        headers=auth_headers(admin.id),
        json={"role": "manager"},
    )
    assert admin_update.status_code == 200
    assert admin_update.json()["role"] == UserRole.MANAGER.value


def test_delete_user_removes_linked_profile(client: TestClient) -> None:
    database = client.app.state.database
    user = create_user(database, email="delete@example.com", hashed_password="hash")
    caller = create_user(database, email="caller@example.com", hashed_password="hash")
    create_profile(database, user_id=user.id, name="Delete Me")

    forbidden = client.delete(f"/users/{user.id}", headers=auth_headers(caller.id))
    assert forbidden.status_code == 403
    assert get_user_by_id(database, user.id) is not None
    assert get_profile_by_user_id(database, user.id) is not None

    response = client.delete(f"/users/{user.id}", headers=auth_headers(user.id))

    assert response.status_code == 204
    assert get_user_by_id(database, user.id) is None
    assert get_profile_by_user_id(database, user.id) is None
    assert client.delete(
        f"/users/{user.id}",
        headers=auth_headers(caller.id),
    ).status_code == 404


def test_profile_me_requires_auth_and_only_updates_own_profile(client: TestClient) -> None:
    database = client.app.state.database
    user = create_user(database, email="profile@example.com", hashed_password="hash")
    other_user = create_user(database, email="other-profile@example.com", hashed_password="hash")
    profile = create_profile(
        database,
        user_id=user.id,
        name="Original Name",
        phone="555-0100",
        address="Original Address",
    )
    other_profile = create_profile(database, user_id=other_user.id, name="Other User")

    assert client.get("/profiles/me").status_code == 401

    headers = auth_headers(user.id)
    response = client.get("/profiles/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == profile.id
    assert response.json()["user_id"] == user.id

    update = client.put(
        "/profiles/me",
        headers=headers,
        json={"name": "Updated Name", "phone": None},
    )
    assert update.status_code == 200
    assert update.json()["name"] == "Updated Name"
    assert update.json()["phone"] is None
    assert update.json()["address"] == "Original Address"

    attempted_transfer = client.put(
        "/profiles/me",
        headers=headers,
        json={"name": "Unauthorized", "user_id": other_user.id},
    )
    assert attempted_transfer.status_code == 422
    assert get_profile_by_user_id(database, other_user.id) == other_profile


def test_login_returns_access_token_and_auth_me_returns_profile(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "7")
    registration = client.post(
        "/users",
        json={
            "email": "login@example.com",
            "password": "correct-horse-battery",
            "name": "Login User",
            "phone": "555-0199",
            "address": "9 Account Road",
        },
    )
    assert registration.status_code == 201

    login = client.post(
        "/auth/login",
        json={"email": "LOGIN@example.com", "password": "correct-horse-battery"},
    )
    assert login.status_code == 200
    token_data = login.json()
    assert token_data["token_type"] == "bearer"
    assert token_data["expires_in"] == 420
    claims = jwt.decode(token_data["access_token"], JWT_SECRET, algorithms=["HS256"])

    me = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json() == {
        "email": "login@example.com",
        "role": UserRole.USER.value,
        "profile": {
            "name": "Login User",
            "phone": "555-0199",
            "address": "9 Account Road",
        },
    }
    assert claims["sub"] == registration.json()["id"]
    assert client.get("/auth/me").status_code == 401

    invalid_login = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "incorrect-password"},
    )
    assert invalid_login.status_code == 401


def test_login_rejects_missing_secret_and_invalid_expiration(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client.post(
        "/users",
        json={"email": "no-secret@example.com", "password": "correct-horse-battery"},
    )
    monkeypatch.delenv("JWT_SECRET_KEY")

    response = client.post(
        "/auth/login",
        json={"email": "no-secret@example.com", "password": "correct-horse-battery"},
    )

    assert response.status_code == 500

    monkeypatch.setenv("JWT_SECRET_KEY", JWT_SECRET)
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "0")
    invalid_expiration = client.post(
        "/auth/login",
        json={"email": "no-secret@example.com", "password": "correct-horse-battery"},
    )
    assert invalid_expiration.status_code == 500


def test_current_user_rejects_invalid_tokens_and_user_lookup_failures(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    database = client.app.state.database
    user = create_user(database, email="auth-dependency@example.com", hashed_password="hash")
    inactive_user = create_user(
        database,
        email="inactive@example.com",
        hashed_password="hash",
        is_active=False,
    )

    assert client.get("/auth/me").status_code == 401
    assert client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    ).status_code == 401
    assert client.get("/auth/me", headers=auth_headers("missing-user-id")).status_code == 401
    assert client.get("/auth/me", headers=auth_headers(inactive_user.id)).status_code == 401

    monkeypatch.delenv("JWT_SECRET_KEY")
    missing_secret = client.get("/auth/me", headers=auth_headers(user.id))
    assert missing_secret.status_code == 401
    assert missing_secret.headers["www-authenticate"] == "Bearer"

    monkeypatch.setenv("JWT_SECRET_KEY", JWT_SECRET)

    def failed_user_lookup(database, user_id):
        raise RuntimeError("database lookup failed")

    monkeypatch.setattr(
        "ai_engineering_company_project_monorepo.api.dependencies.get_user_by_id",
        failed_user_lookup,
    )
    lookup_failure = client.get("/auth/me", headers=auth_headers(user.id))
    assert lookup_failure.status_code == 401


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("GET", "/users", None),
        ("GET", "/users/unknown-user", None),
        ("PUT", "/users/unknown-user", {"email": "updated@example.com"}),
        ("DELETE", "/users/unknown-user", None),
        ("GET", "/profiles/me", None),
        ("PUT", "/profiles/me", {"name": "Unauthorized"}),
        ("GET", "/auth/me", None),
    ],
)
def test_every_private_route_requires_authentication(
    client: TestClient,
    method: str,
    path: str,
    payload: dict[str, str] | None,
) -> None:
    response = client.request(method, path, json=payload)

    assert response.status_code == 401