from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")

    assert response.status_code == 200


def test_incident_analysis_requires_data():
    response = client.post(
        "/api/incidents/analyze",
        json={},
    )

    assert response.status_code in (400, 422)


def test_incident_analysis_invalid_data():
    response = client.post(
        "/api/incidents/analyze",
        json={"invalid": "data"},
    )

    assert response.status_code in (400, 422)


def test_login_missing_credentials():
    response = client.post(
        "/auth/login",
        json={
            "email": "does-not-exist@example.com",
            "password": "wrong-password",
        },
    )

    assert response.status_code in (400, 401, 404)


def test_protected_profile_without_token():
    response = client.get("/profiles/me")

    assert response.status_code in (401, 403)


def test_user_profile_without_token():
    response = client.get("/auth/me")

    assert response.status_code in (401, 403)


def test_users_list_without_token():
    response = client.get("/users/")

    assert response.status_code in (401, 403)


def test_register_missing_fields():
    response = client.post(
        "/auth/register",
        json={},
    )

    assert response.status_code in (400, 422)