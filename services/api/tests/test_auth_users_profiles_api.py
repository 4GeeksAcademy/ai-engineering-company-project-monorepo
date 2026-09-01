import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB, Query

from main import app
import routers.auth as auth_router_module
import routers.profiles as profiles_router_module
import routers.users as users_router_module
import security as security_module


@pytest.fixture
def client(tmp_path, monkeypatch):
    test_db = TinyDB(tmp_path / "auth-test.json")
    test_users_table = test_db.table("users")
    test_profiles_table = test_db.table("profiles")
    test_reset_tokens_table = test_db.table("reset_tokens")

    monkeypatch.setattr(
        users_router_module,
        "users_table",
        test_users_table,
    )
    monkeypatch.setattr(
        users_router_module,
        "profiles_table",
        test_profiles_table,
    )
    monkeypatch.setattr(
        profiles_router_module,
        "profiles_table",
        test_profiles_table,
    )
    monkeypatch.setattr(
        auth_router_module,
        "users_table",
        test_users_table,
    )
    monkeypatch.setattr(
        security_module,
        "users_table",
        test_users_table,
    )
    monkeypatch.setattr(
        security_module,
        "reset_tokens_table",
        test_reset_tokens_table,
    )

    monkeypatch.setenv(
        "SECRET_KEY",
        "test-secret-key-for-testing-only",
    )

    # Prevent actual email sending during tests
    monkeypatch.setattr(
        auth_router_module,
        "send_password_reset_email",
        lambda email, token: None,
    )

    with TestClient(app) as test_client:
        yield test_client

    test_db.close()


# ──────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────


def create_user_and_get_token(client):
    client.post(
        "/users",
        json={
            "email": "test@example.com",
            "password": "strongpass123",
            "role": "user",
        },
    )

    response = client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "strongpass123",
        },
    )

    token = response.json()["access_token"]

    return token


# ══════════════════════════════════════════════
# Users
# ══════════════════════════════════════════════


class TestUsers:
    def test_create_user_returns_201(self, client):
        response = client.post(
            "/users",
            json={
                "email": "alice@example.com",
                "password": "secret123",
                "role": "user",
            },
        )

        data = response.json()

        assert response.status_code == 201
        assert data["email"] == "alice@example.com"
        assert data["role"] == "user"
        assert data["is_active"] is True
        assert "id" in data
        assert "created_at" in data
        # password must not be returned
        assert "password" not in data
        assert "hashed_password" not in data

    def test_create_user_default_role_is_user(self, client):
        response = client.post(
            "/users",
            json={
                "email": "bob@example.com",
                "password": "secret123",
            },
        )

        data = response.json()

        assert response.status_code == 201
        assert data["role"] == "user"

    def test_create_user_cannot_be_admin(self, client):
        response = client.post(
            "/users",
            json={
                "email": "admin-wannabe@example.com",
                "password": "secret123",
                "role": "admin",
            },
        )

        assert response.status_code == 403

        # Verify user was NOT created
        login_response = client.post(
            "/auth/login",
            json={
                "email": "admin-wannabe@example.com",
                "password": "secret123",
            },
        )
        assert login_response.status_code == 401

    def test_create_user_cannot_be_manager(self, client):
        response = client.post(
            "/users",
            json={
                "email": "manager-wannabe@example.com",
                "password": "secret123",
                "role": "manager",
            },
        )

        assert response.status_code == 403

        # Verify user was NOT created
        login_response = client.post(
            "/auth/login",
            json={
                "email": "manager-wannabe@example.com",
                "password": "secret123",
            },
        )
        assert login_response.status_code == 401

    def test_create_user_password_not_stored_in_plain_text(self, client, tmp_path):
        test_db = TinyDB(tmp_path / "auth-test-pw.json")
        test_users_table = test_db.table("users")

        import routers.users as users_router_module2

        users_router_module2.users_table = test_users_table

        client2 = TestClient(app)

        client2.post(
            "/users",
            json={
                "email": "pwcheck@example.com",
                "password": "mysecretpass",
            },
        )

        stored = test_users_table.all()[0]
        stored_password = stored.get("hashed_password", "")

        assert stored_password != "mysecretpass"
        assert stored_password.startswith("$2b$") or stored_password.startswith("$2a$")

        test_db.close()

    def test_create_duplicate_email_returns_409(self, client):
        client.post(
            "/users",
            json={
                "email": "dupe@example.com",
                "password": "secret123",
            },
        )

        response = client.post(
            "/users",
            json={
                "email": "dupe@example.com",
                "password": "otherpass456",
            },
        )

        assert response.status_code == 409

    def test_get_users_without_token_returns_401(self, client):
        response = client.get("/users")

        assert response.status_code == 401

    def test_get_own_user_returns_200(self, client):
        token = create_user_and_get_token(client)

        response = client.get(
            "/users/1",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["email"] == "test@example.com"

    def test_get_other_user_returns_403(self, client):
        token = create_user_and_get_token(client)

        # Create second user
        client.post(
            "/users",
            json={
                "email": "other@example.com",
                "password": "otherpass123",
            },
        )

        response = client.get(
            "/users/2",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403

    def test_update_own_email_returns_200(self, client):
        token = create_user_and_get_token(client)

        response = client.put(
            "/users/1",
            json={"email": "updated@example.com"},
            headers={"Authorization": f"Bearer {token}"},
        )

        data = response.json()

        assert response.status_code == 200
        assert data["email"] == "updated@example.com"

    def test_update_own_password_hash_changes(self, client):
        token = create_user_and_get_token(client)

        response = client.put(
            "/users/1",
            json={"password": "newpassword456"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200

        # Verify login with new password works
        login_response = client.post(
            "/auth/login",
            json={
                "email": "test@example.com",
                "password": "newpassword456",
            },
        )

        assert login_response.status_code == 200

        # Old password should not work
        old_login_response = client.post(
            "/auth/login",
            json={
                "email": "test@example.com",
                "password": "strongpass123",
            },
        )

        assert old_login_response.status_code == 401

    def test_user_cannot_change_role_to_admin(self, client):
        token = create_user_and_get_token(client)

        response = client.put(
            "/users/1",
            json={"role": "admin"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403

    def test_user_cannot_change_is_active(self, client):
        token = create_user_and_get_token(client)

        response = client.put(
            "/users/1",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403

    def test_delete_other_user_returns_403(self, client):
        token = create_user_and_get_token(client)

        # Create second user
        client.post(
            "/users",
            json={
                "email": "other2@example.com",
                "password": "otherpass123",
            },
        )

        response = client.delete(
            "/users/2",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403

    def test_delete_own_user_returns_200(self, client):
        token = create_user_and_get_token(client)

        response = client.delete(
            "/users/1",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["detail"] == "User deleted successfully"

        # Verify user is gone
        login_response = client.post(
            "/auth/login",
            json={
                "email": "test@example.com",
                "password": "strongpass123",
            },
        )

        assert login_response.status_code == 401

    def test_update_other_user_returns_403(self, client):
        token = create_user_and_get_token(client)

        client.post(
            "/users",
            json={
                "email": "other3@example.com",
                "password": "otherpass123",
            },
        )

        response = client.put(
            "/users/2",
            json={"email": "hacked@example.com"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403


# ══════════════════════════════════════════════
# Auth
# ══════════════════════════════════════════════


class TestAuth:
    def test_login_correct_returns_200_and_token(self, client):
        client.post(
            "/users",
            json={
                "email": "login@example.com",
                "password": "pass123",
            },
        )

        response = client.post(
            "/auth/login",
            json={
                "email": "login@example.com",
                "password": "pass123",
            },
        )

        data = response.json()

        assert response.status_code == 200
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, client):
        client.post(
            "/users",
            json={
                "email": "login2@example.com",
                "password": "pass123",
            },
        )

        response = client.post(
            "/auth/login",
            json={
                "email": "login2@example.com",
                "password": "wrongpass",
            },
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"

    def test_login_wrong_email_returns_401(self, client):
        response = client.post(
            "/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "pass123",
            },
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"

    def test_auth_me_with_token_returns_200(self, client):
        token = create_user_and_get_token(client)

        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        data = response.json()

        assert response.status_code == 200
        assert data["email"] == "test@example.com"

    def test_auth_me_without_token_returns_401(self, client):
        response = client.get("/auth/me")

        assert response.status_code == 401

    def test_auth_me_with_invalid_token_returns_401(self, client):
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalidtoken123"},
        )

        assert response.status_code == 401


# ══════════════════════════════════════════════
# Password Reset
# ══════════════════════════════════════════════


class TestPasswordReset:
    def test_forgot_password_returns_200_for_existing_user(self, client):
        client.post(
            "/users",
            json={
                "email": "reset@example.com",
                "password": "oldpass123",
            },
        )

        response = client.post(
            "/auth/forgot-password",
            json={"email": "reset@example.com"},
        )

        assert response.status_code == 200
        assert response.json()["detail"] == (
            "If an account with that email exists, a password reset link has been sent."
        )

    def test_forgot_password_returns_200_for_nonexistent_user(self, client):
        response = client.post(
            "/auth/forgot-password",
            json={"email": "nobody@example.com"},
        )

        assert response.status_code == 200
        assert response.json()["detail"] == (
            "If an account with that email exists, a password reset link has been sent."
        )

    def test_forgot_password_for_inactive_user_does_not_send_email(self, client):
        client.post(
            "/users",
            json={
                "email": "inactive@example.com",
                "password": "pass123",
            },
        )
        # Deactivate the user
        User = Query()
        user_docs = security_module.users_table.search(User.email == "inactive@example.com")
        security_module.users_table.update(
            {"is_active": False},
            doc_ids=[user_docs[0].doc_id],
        )

        response = client.post(
            "/auth/forgot-password",
            json={"email": "inactive@example.com"},
        )

        # Should still return 200, but no token should be stored
        assert response.status_code == 200

        # Verify no reset token was created
        assert len(security_module.reset_tokens_table.all()) == 0

    def test_reset_password_with_valid_token_returns_200(self, client):
        # Create user
        client.post(
            "/users",
            json={
                "email": "reset2@example.com",
                "password": "oldpass456",
            },
        )

        # Request reset
        client.post(
            "/auth/forgot-password",
            json={"email": "reset2@example.com"},
        )

        # Get the stored token
        stored = security_module.reset_tokens_table.all()[0]
        token = stored["token"]

        # Reset password
        response = client.post(
            "/auth/reset-password",
            json={
                "token": token,
                "new_password": "newpass789",
            },
        )

        assert response.status_code == 200
        assert response.json()["detail"] == "Password has been reset successfully."

        # Verify new password works
        login_response = client.post(
            "/auth/login",
            json={
                "email": "reset2@example.com",
                "password": "newpass789",
            },
        )

        assert login_response.status_code == 200

        # Old password does not work
        old_login_response = client.post(
            "/auth/login",
            json={
                "email": "reset2@example.com",
                "password": "oldpass456",
            },
        )

        assert old_login_response.status_code == 401

    def test_reset_token_is_single_use(self, client):
        # Create user
        client.post(
            "/users",
            json={
                "email": "singleuse@example.com",
                "password": "firstpass",
            },
        )

        # Request reset
        client.post(
            "/auth/forgot-password",
            json={"email": "singleuse@example.com"},
        )

        stored = security_module.reset_tokens_table.all()[0]
        token = stored["token"]

        # First use — should work
        first_response = client.post(
            "/auth/reset-password",
            json={
                "token": token,
                "new_password": "secondpass",
            },
        )

        assert first_response.status_code == 200

        # Second use — should fail
        second_response = client.post(
            "/auth/reset-password",
            json={
                "token": token,
                "new_password": "thirdpass",
            },
        )

        assert second_response.status_code == 400
        assert second_response.json()["detail"] == "Invalid or expired reset token"

    def test_reset_password_with_invalid_token_returns_400(self, client):
        response = client.post(
            "/auth/reset-password",
            json={
                "token": "invalid-token-123",
                "new_password": "newpass123",
            },
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid or expired reset token"

    def test_reset_password_with_expired_token_returns_400(self, client):
        from datetime import datetime, timedelta, timezone

        client.post(
            "/users",
            json={
                "email": "expired@example.com",
                "password": "oldpass",
            },
        )

        # Manually insert an expired token
        security_module.reset_tokens_table.insert({
            "token": "expired-token-test",
            "user_id": 1,
            "expires_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            "used": False,
        })

        response = client.post(
            "/auth/reset-password",
            json={
                "token": "expired-token-test",
                "new_password": "newpass",
            },
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid or expired reset token"

    def test_change_password_returns_200(self, client):
        token = create_user_and_get_token(client)

        response = client.post(
            "/auth/change-password",
            json={
                "current_password": "strongpass123",
                "new_password": "newerpass123",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["detail"] == "Password changed successfully."

        # Verify new password works
        login_response = client.post(
            "/auth/login",
            json={
                "email": "test@example.com",
                "password": "newerpass123",
            },
        )

        assert login_response.status_code == 200

    def test_change_password_with_wrong_current_password_returns_400(self, client):
        token = create_user_and_get_token(client)

        response = client.post(
            "/auth/change-password",
            json={
                "current_password": "wrongpass",
                "new_password": "newpass123",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Current password is incorrect"

    def test_change_password_without_token_returns_401(self, client):
        response = client.post(
            "/auth/change-password",
            json={
                "current_password": "oldpass",
                "new_password": "newpass",
            },
        )

        assert response.status_code == 401


# ══════════════════════════════════════════════
# Profiles
# ══════════════════════════════════════════════


class TestProfiles:
    def test_create_profile_with_user(self, client):
        response = client.post(
            "/users",
            json={
                "email": "profile@example.com",
                "password": "pass123",
                "name": "Alice Smith",
                "phone": "+1-555-0100",
                "address": "123 Main St, Los Angeles, CA",
            },
        )

        assert response.status_code == 201

        # Login to get token
        login_response = client.post(
            "/auth/login",
            json={
                "email": "profile@example.com",
                "password": "pass123",
            },
        )

        token = login_response.json()["access_token"]

        # Get profile
        profile_response = client.get(
            "/profiles/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        data = profile_response.json()

        assert profile_response.status_code == 200
        assert data["name"] == "Alice Smith"
        assert data["phone"] == "+1-555-0100"
        assert data["address"] == "123 Main St, Los Angeles, CA"
        assert data["user_id"] == 1

    def test_get_profiles_me_returns_200(self, client):
        token = create_user_and_get_token(client)

        response = client.get(
            "/profiles/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        # No profile was created for this user, so 404 expected
        assert response.status_code == 404

    def test_put_profiles_me_creates_profile_if_not_exists(self, client):
        token = create_user_and_get_token(client)

        response = client.put(
            "/profiles/me",
            json={"name": "Test User", "phone": "+1-555-9999"},
            headers={"Authorization": f"Bearer {token}"},
        )

        data = response.json()

        assert response.status_code == 200
        assert data["name"] == "Test User"
        assert data["phone"] == "+1-555-9999"
        assert data["user_id"] == 1

    def test_put_profiles_me_updates_existing_profile(self, client):
        # Create user with profile
        client.post(
            "/users",
            json={
                "email": "updateprof@example.com",
                "password": "pass123",
                "name": "Original Name",
            },
        )

        login_response = client.post(
            "/auth/login",
            json={
                "email": "updateprof@example.com",
                "password": "pass123",
            },
        )

        token = login_response.json()["access_token"]

        # Update profile
        response = client.put(
            "/profiles/me",
            json={"name": "Updated Name", "address": "456 Oak Ave"},
            headers={"Authorization": f"Bearer {token}"},
        )

        data = response.json()

        assert response.status_code == 200
        assert data["name"] == "Updated Name"
        assert data["address"] == "456 Oak Ave"
        assert data["user_id"] == 1