from __future__ import annotations

import importlib
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from jose import jwt

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api.app import app  # pylint: disable=wrong-import-position

auth = importlib.import_module("auth")
users = importlib.import_module("users")


class UsersApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_database_path = users.DATABASE_PATH
        users.DATABASE_PATH = Path(self.temp_dir.name) / "company_api.db"
        self.client = TestClient(app)

    def tearDown(self) -> None:
        users.DATABASE_PATH = self.original_database_path
        self.temp_dir.cleanup()

    def _register(self, email: str, password: str = "secret-password") -> dict:
        response = self.client.post("/users", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 201)
        return response.json()

    def _token(self, email: str, password: str = "secret-password") -> str:
        response = self.client.post("/auth/token", data={"username": email, "password": password})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["token_type"], "bearer")
        return payload["access_token"]

    def _auth_headers(self, email: str, password: str = "secret-password") -> dict[str, str]:
        return {"Authorization": f"Bearer {self._token(email, password)}"}

    def test_jwt_configuration_comes_from_environment_without_hardcoded_secret(self) -> None:
        with patch.dict("os.environ", {"JWT_SECRET_KEY": "test-secret-from-env"}, clear=False):
            self.assertEqual(auth._load_secret_key(), "test-secret-from-env")

        with patch.dict("os.environ", {"ACCESS_TOKEN_EXPIRE_MINUTES": "7"}, clear=False):
            self.assertEqual(auth._load_access_token_expire_minutes(), 7)

        with patch.dict("os.environ", {}, clear=True):
            generated_secret = auth._load_secret_key()

        self.assertNotEqual(generated_secret, "change-this-development-secret")
        self.assertGreaterEqual(len(generated_secret), 32)

    def test_register_hashes_password_and_bootstraps_first_admin(self) -> None:
        user = self._register("Admin@Example.com")

        self.assertEqual(user["email"], "admin@example.com")
        self.assertTrue(user["is_active"])
        self.assertTrue(user["is_admin"])
        self.assertIn("created_at", user)
        self.assertNotIn("hashed_password", user)

        stored = users.get_user_by_email("admin@example.com")
        self.assertIsNotNone(stored)
        assert stored is not None
        self.assertNotEqual(stored["hashed_password"], "secret-password")
        self.assertTrue(users.verify_password("secret-password", stored["hashed_password"]))

    def test_duplicate_email_is_rejected(self) -> None:
        self._register("user@example.com")

        response = self.client.post("/users", json={"email": "USER@example.com", "password": "secret-password"})

        self.assertEqual(response.status_code, 409)

    def test_auth_register_returns_token_and_current_profile(self) -> None:
        register_response = self.client.post(
            "/auth/register",
            json={"email": "new-user@example.com", "password": "secret-password"},
        )
        self.assertEqual(register_response.status_code, 201)
        payload = register_response.json()
        self.assertEqual(payload["token_type"], "bearer")
        self.assertTrue(payload["access_token"])
        self.assertEqual(payload["user"]["email"], "new-user@example.com")
        self.assertNotIn("hashed_password", payload["user"])

        me_response = self.client.get("/auth/me", headers={"Authorization": f"Bearer {payload['access_token']}"})
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.json()["email"], "new-user@example.com")

    def test_auth_login_accepts_json_credentials(self) -> None:
        self._register("user@example.com")

        response = self.client.post(
            "/auth/login",
            json={"email": "user@example.com", "password": "secret-password"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["token_type"], "bearer")
        self.assertTrue(payload["access_token"])
        self.assertEqual(payload["user"]["email"], "user@example.com")
        self.assertNotIn("hashed_password", payload["user"])

    def test_auth_login_rejects_invalid_credentials(self) -> None:
        self._register("user@example.com")

        response = self.client.post(
            "/auth/login",
            json={"email": "user@example.com", "password": "wrong-password"},
        )

        self.assertEqual(response.status_code, 401)

    def test_protected_user_routes_require_bearer_token(self) -> None:
        user = self._register("user@example.com")

        protected_requests = [
            self.client.get("/auth/me"),
            self.client.get("/users"),
            self.client.get(f"/users/{user['id']}"),
            self.client.put(f"/users/{user['id']}", json={"email": "blocked@example.com"}),
            self.client.delete(f"/users/{user['id']}"),
        ]
        for response in protected_requests:
            self.assertEqual(response.status_code, 401)

    def test_protected_route_rejects_malformed_token(self) -> None:
        self._register("user@example.com")

        response = self.client.get("/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt"})

        self.assertEqual(response.status_code, 401)

    def test_protected_route_rejects_expired_token(self) -> None:
        user = self._register("user@example.com")
        expired_token = jwt.encode(
            {"sub": str(user["id"]), "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
            auth.SECRET_KEY,
            algorithm=auth.ALGORITHM,
        )

        response = self.client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})

        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_list_and_read_users(self) -> None:
        admin = self._register("admin@example.com")
        member = self._register("member@example.com")

        list_response = self.client.get("/users", headers=self._auth_headers("admin@example.com"))
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual([user["id"] for user in list_response.json()], [admin["id"], member["id"]])

        read_response = self.client.get(f"/users/{member['id']}", headers=self._auth_headers("member@example.com"))
        self.assertEqual(read_response.status_code, 200)
        self.assertEqual(read_response.json()["email"], "member@example.com")

        admin_read_response = self.client.get(f"/users/{member['id']}", headers=self._auth_headers("admin@example.com"))
        self.assertEqual(admin_read_response.status_code, 200)
        self.assertEqual(admin_read_response.json()["email"], "member@example.com")

    def test_authenticated_user_can_list_but_not_read_other_users(self) -> None:
        self._register("admin@example.com")
        member = self._register("member@example.com")
        other = self._register("other@example.com")
        member_headers = self._auth_headers("member@example.com")

        list_response = self.client.get("/users", headers=member_headers)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 3)

        read_other_response = self.client.get(f"/users/{other['id']}", headers=member_headers)
        self.assertEqual(read_other_response.status_code, 403)

        read_self_response = self.client.get(f"/users/{member['id']}", headers=member_headers)
        self.assertEqual(read_self_response.status_code, 200)

    def test_user_can_update_self_but_not_escalate_or_update_others(self) -> None:
        admin = self._register("admin@example.com")
        member = self._register("member@example.com")
        other = self._register("other@example.com")
        member_headers = self._auth_headers("member@example.com")

        self_update = self.client.put(
            f"/users/{member['id']}",
            json={"email": "new-member@example.com", "password": "new-secret-password"},
            headers=member_headers,
        )
        self.assertEqual(self_update.status_code, 200)
        self.assertEqual(self_update.json()["email"], "new-member@example.com")

        escalation = self.client.put(f"/users/{member['id']}", json={"is_admin": True}, headers=member_headers)
        self.assertEqual(escalation.status_code, 403)

        other_update = self.client.put(f"/users/{other['id']}", json={"email": "blocked@example.com"}, headers=member_headers)
        self.assertEqual(other_update.status_code, 403)

        admin_update = self.client.put(
            f"/users/{other['id']}",
            json={"is_active": False, "is_admin": True},
            headers=self._auth_headers("admin@example.com"),
        )
        self.assertEqual(admin_update.status_code, 200)
        self.assertFalse(admin_update.json()["is_active"])
        self.assertTrue(admin_update.json()["is_admin"])

        admin_delete = self.client.delete(f"/users/{other['id']}", headers=self._auth_headers("admin@example.com"))
        self.assertEqual(admin_delete.status_code, 200)
        self.assertEqual(admin_delete.json()["id"], other["id"])

        missing = self.client.get(f"/users/{other['id']}", headers=self._auth_headers("admin@example.com"))
        self.assertEqual(missing.status_code, 404)
        self.assertTrue(admin["is_admin"])

    def test_create_user_then_login_accepts_optional_profile_name(self) -> None:
        created = self.client.post(
            "/users",
            json={
                "email": "lucia@example.com",
                "password": "secret-password",
                "name": "Lucía Fernández",
                "ignored_profile_field": "skipped",
            },
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["name"], "Lucía Fernández")
        self.assertNotIn("hashed_password", created.json())

        login = self.client.post(
            "/auth/login",
            json={"email": "lucia@example.com", "password": "secret-password"},
        )
        self.assertEqual(login.status_code, 200)
        self.assertTrue(login.json()["access_token"])
        self.assertEqual(login.json()["user"]["email"], "lucia@example.com")
        self.assertEqual(login.json()["user"]["name"], "Lucía Fernández")

    def test_auth_me_and_profiles_me_expose_contact_fields(self) -> None:
        self._register("ops@example.com")
        headers = self._auth_headers("ops@example.com")

        me = self.client.get("/auth/me", headers=headers)
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["email"], "ops@example.com")
        self.assertIn("name", me.json())
        self.assertIn("phone", me.json())
        self.assertIn("address", me.json())

        anonymous = self.client.put("/profiles/me", json={"name": "Felipe Guerrero"})
        self.assertEqual(anonymous.status_code, 401)

        updated = self.client.put(
            "/profiles/me",
            json={
                "name": "Felipe Guerrero",
                "phone": "+57 300 000 0000",
                "address": "Medellín HQ",
            },
            headers=headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["name"], "Felipe Guerrero")
        self.assertEqual(updated.json()["phone"], "+57 300 000 0000")
        self.assertEqual(updated.json()["address"], "Medellín HQ")
        self.assertEqual(updated.json()["email"], "ops@example.com")

        me_after = self.client.get("/auth/me", headers=headers)
        self.assertEqual(me_after.json()["name"], "Felipe Guerrero")
        self.assertEqual(me_after.json()["phone"], "+57 300 000 0000")
        self.assertEqual(me_after.json()["address"], "Medellín HQ")

    def test_create_user_rejects_invalid_email_with_field_errors(self) -> None:
        response = self.client.post("/users", json={"email": "not-an-email", "password": "secret-password"})
        self.assertEqual(response.status_code, 422)
        self.assertTrue(any("email" in item.get("loc", []) for item in response.json()["detail"]))

    def test_locations_overview_requires_real_jwt(self) -> None:
        anonymous = self.client.get("/locations/overview")
        self.assertEqual(anonymous.status_code, 401)

        self._register("ops@example.com")
        headers = self._auth_headers("ops@example.com")
        response = self.client.get("/locations/overview", headers=headers)
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["company"], "Brasaland")
        self.assertEqual(payload["total_locations"], 14)
        self.assertEqual(payload["colombia_count"], 8)
        self.assertEqual(payload["florida_count"], 6)
        self.assertEqual(payload["currencies"], ["COP", "USD"])

    def test_authenticated_inventory_list_works_with_bearer_token(self) -> None:
        self._register("ops@example.com")
        response = self.client.get("/inventory", headers=self._auth_headers("ops@example.com"))
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)


if __name__ == "__main__":
    unittest.main()
