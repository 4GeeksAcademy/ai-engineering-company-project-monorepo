
from uuid import uuid4

from fastapi.testclient import TestClient

from services.api.main import app
from services.api.auth.users import (
    create_user,
    delete_user,
    get_user_by_email,
    get_user_by_id,
    update_user,
)


client = TestClient(app)


def unique_email(prefix="test-user"):
    return f"{prefix}-{uuid4().hex}@example.com"


def create_authenticated_user():
    email = unique_email("authenticated")
    password = "test-password-123"

    register = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
        },
    )

    assert register.status_code == 201

    login = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login.status_code == 200

    data = login.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"

    return email, password, {
        "Authorization": f"Bearer {data['access_token']}",
    }


# ============================================================
# HEALTH
# ============================================================


def test_health_check():
    response = client.get("/api/health")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["service"] == "brasaland-incident-api"


# ============================================================
# INCIDENT ANALYSIS
# ============================================================


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


def test_incident_analysis_rejects_non_csv():
    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.txt",
                b"this is not a csv",
                "text/plain",
            )
        },
    )

    assert response.status_code == 400

    data = response.json()

    assert "CSV" in data["detail"]


def test_incident_analysis_rejects_invalid_csv():
    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.csv",
                b"\xff\xfe\x00\x01",
                "text/csv",
            )
        },
    )

    assert response.status_code == 400


def test_incident_analysis_missing_columns():
    csv_content = (
        "location_id,category\n"
        "COL-01,EQUIPMENT\n"
    )

    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 400

    data = response.json()

    assert "Faltan columnas" in data["detail"]


def test_incident_analysis_valid_csv():
    csv_content = (
        "location_id,category,description,reporter_id,"
        "status,satisfaction_score\n"
        "COL-01,EQUIPMENT,Machine broken,rep-001,CLOSED,4\n"
        "FLA-01,STAFF,Staff issue,rep-002,OPEN,\n"
        "COL-02,SUPPLY,Supplies missing,rep-003,DISCARDED,\n"
    )

    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_records"] == 3
    assert data["valid_records"] == 3
    assert data["invalid_records"] == 0

    assert data["closed_incidents"] == 1
    assert data["average_satisfaction"] == 4.0

    assert data["by_category"]["EQUIPMENT"] == 1
    assert data["by_category"]["STAFF"] == 1
    assert data["by_category"]["SUPPLY"] == 1

    assert data["by_status"]["CLOSED"] == 1
    assert data["by_status"]["OPEN"] == 1
    assert data["by_status"]["DISCARDED"] == 1


def test_incident_analysis_invalid_location():
    csv_content = (
        "location_id,category,description,reporter_id,"
        "status,satisfaction_score\n"
        "INVALID,EQUIPMENT,Machine broken,rep-001,CLOSED,4\n"
    )

    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_records"] == 1
    assert data["valid_records"] == 0
    assert data["invalid_records"] == 1
    assert data["invalid_breakdown"]["invalid_location"] == 1


def test_incident_analysis_invalid_category():
    csv_content = (
        "location_id,category,description,reporter_id,"
        "status,satisfaction_score\n"
        "COL-01,INVALID,Machine broken,rep-001,CLOSED,4\n"
    )

    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid_records"] == 0
    assert data["invalid_records"] == 1
    assert data["invalid_breakdown"]["invalid_category"] == 1


def test_incident_analysis_invalid_description():
    csv_content = (
        "location_id,category,description,reporter_id,"
        "status,satisfaction_score\n"
        "COL-01,EQUIPMENT,abc,rep-001,CLOSED,4\n"
    )

    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid_records"] == 0
    assert data["invalid_records"] == 1
    assert data["invalid_breakdown"]["invalid_description"] == 1


def test_incident_analysis_invalid_reporter():
    csv_content = (
        "location_id,category,description,reporter_id,"
        "status,satisfaction_score\n"
        "COL-01,EQUIPMENT,Machine broken,,CLOSED,4\n"
    )

    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid_records"] == 0
    assert data["invalid_records"] == 1
    assert data["invalid_breakdown"]["invalid_reporter"] == 1


def test_incident_analysis_closed_without_score():
    csv_content = (
        "location_id,category,description,reporter_id,"
        "status,satisfaction_score\n"
        "COL-01,EQUIPMENT,Machine broken,rep-001,CLOSED,\n"
    )

    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid_records"] == 0
    assert data["invalid_records"] == 1
    assert data["invalid_breakdown"]["missing_closed_score"] == 1


def test_incident_analysis_invalid_score():
    csv_content = (
        "location_id,category,description,reporter_id,"
        "status,satisfaction_score\n"
        "COL-01,EQUIPMENT,Machine broken,rep-001,CLOSED,8\n"
    )

    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid_records"] == 0
    assert data["invalid_records"] == 1
    assert data["invalid_breakdown"]["invalid_score"] == 1


def test_incident_analysis_multiple_invalid_fields():
    csv_content = (
        "location_id,category,description,reporter_id,"
        "status,satisfaction_score\n"
        "INVALID,INVALID,abc,,CLOSED,9\n"
    )

    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid_records"] == 0
    assert data["invalid_records"] == 1

    breakdown = data["invalid_breakdown"]

    assert breakdown["invalid_location"] == 1
    assert breakdown["invalid_category"] == 1
    assert breakdown["invalid_description"] == 1
    assert breakdown["invalid_reporter"] == 1
    assert breakdown["invalid_score"] == 1
    assert breakdown["missing_closed_score"] == 0


def test_incident_analysis_open_without_score_is_valid():
    csv_content = (
        "location_id,category,description,reporter_id,"
        "status,satisfaction_score\n"
        "COL-01,EQUIPMENT,Machine broken,rep-001,OPEN,\n"
    )

    response = client.post(
        "/api/incidents/analyze",
        files={
            "file": (
                "incidents.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_records"] == 1
    assert data["valid_records"] == 1
    assert data["invalid_records"] == 0


# ============================================================
# AUTHENTICATION
# ============================================================


def test_register_missing_fields():
    response = client.post(
        "/auth/register",
        json={},
    )

    assert response.status_code in (400, 422)


def test_register_valid_user():
    email = unique_email("register")
    password = "test-password-123"

    response = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["email"] == email
    assert data["is_active"] is True
    assert data["role"] == "user"
    assert "id" in data
    assert "created_at" in data

    assert "hashed_password" not in data
    assert "password" not in data


def test_register_duplicate_user():
    email = unique_email("duplicate")
    password = "test-password-123"

    first = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
        },
    )

    assert first.status_code == 201

    second = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
        },
    )

    assert second.status_code == 409


def test_login_invalid_credentials():
    email = unique_email("invalid-login")

    response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": "wrong-password",
        },
    )

    assert response.status_code == 401


def test_login_valid_user():
    email = unique_email("login")
    password = "test-password-123"

    register = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
        },
    )

    assert register.status_code == 201

    response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["access_token"]


def test_auth_me_without_token():
    response = client.get("/auth/me")

    assert response.status_code in (401, 403)


def test_users_me_without_token():
    response = client.get("/users/me")

    assert response.status_code in (401, 403)


def test_users_list_without_token():
    response = client.get("/users/")

    assert response.status_code in (401, 403)


def test_profile_without_token():
    response = client.get("/profiles/me")

    assert response.status_code in (401, 403)


def test_profile_update_without_token():
    response = client.put(
        "/profiles/me",
        json={
            "name": "Test User",
            "phone": "123456789",
            "address": "Test Address",
        },
    )

    assert response.status_code in (401, 403)


# ============================================================
# AUTHENTICATED ENDPOINTS
# ============================================================


def test_authenticated_auth_me():
    email, _, headers = create_authenticated_user()

    response = client.get(
        "/auth/me",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["email"] == email
    assert data["is_active"] is True
    assert data["role"] == "user"

    assert "hashed_password" not in data
    assert "password" not in data


def test_authenticated_users_me():
    email, _, headers = create_authenticated_user()

    response = client.get(
        "/users/me",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["email"] == email
    assert data["is_active"] is True
    assert data["role"] == "user"

    assert "hashed_password" not in data
    assert "password" not in data


def test_authenticated_users_list():
    email, _, headers = create_authenticated_user()

    response = client.get(
        "/users/",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data, list)

    emails = [user["email"] for user in data]

    assert email in emails

    for user in data:
        assert "hashed_password" not in user
        assert "password" not in user


def test_authenticated_profile_get_and_update():
    email, _, headers = create_authenticated_user()

    profile = client.get(
        "/profiles/me",
        headers=headers,
    )

    assert profile.status_code == 404

    update_profile = client.put(
        "/profiles/me",
        headers=headers,
        json={
            "name": "Test User",
            "phone": "123456789",
            "address": "Test Address",
        },
    )

    assert update_profile.status_code == 200

    profile_data = update_profile.json()

    auth_me = client.get(
        "/auth/me",
        headers=headers,
    )

    assert auth_me.status_code == 200

    user_data = auth_me.json()

    assert profile_data["user_id"] == user_data["id"]
    assert profile_data["name"] == "Test User"
    assert profile_data["phone"] == "123456789"
    assert profile_data["address"] == "Test Address"

    assert email == user_data["email"]


def test_authenticated_profile_update_existing():
    _, _, headers = create_authenticated_user()

    first_update = client.put(
        "/profiles/me",
        headers=headers,
        json={
            "name": "First Name",
            "phone": "111111111",
            "address": "First Address",
        },
    )

    assert first_update.status_code == 200

    first_data = first_update.json()

    assert first_data["name"] == "First Name"
    assert first_data["phone"] == "111111111"
    assert first_data["address"] == "First Address"

    second_update = client.put(
        "/profiles/me",
        headers=headers,
        json={
            "name": "Updated Name",
            "phone": "222222222",
            "address": "Updated Address",
        },
    )

    assert second_update.status_code == 200

    second_data = second_update.json()

    assert second_data["id"] == first_data["id"]
    assert second_data["user_id"] == first_data["user_id"]
    assert second_data["name"] == "Updated Name"
    assert second_data["phone"] == "222222222"
    assert second_data["address"] == "Updated Address"


def test_authenticated_profile_get_after_creation():
    _, _, headers = create_authenticated_user()

    create_profile = client.put(
        "/profiles/me",
        headers=headers,
        json={
            "name": "Persistent Profile",
            "phone": "333333333",
            "address": "Persistent Address",
        },
    )

    assert create_profile.status_code == 200

    response = client.get(
        "/profiles/me",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["name"] == "Persistent Profile"
    assert data["phone"] == "333333333"
    assert data["address"] == "Persistent Address"


def test_invalid_token():
    response = client.get(
        "/auth/me",
        headers={
            "Authorization": "Bearer invalid-token",
        },
    )

    assert response.status_code == 401


# ============================================================
# USERS MODULE
# ============================================================


def test_create_user_directly():
    email = unique_email("direct-create")
    password = "test-password-123"

    user = create_user(
        email=email,
        password=password,
    )

    assert user is not None
    assert user["email"] == email
    assert user["is_active"] is True
    assert user["role"] == "user"
    assert "id" in user
    assert "created_at" in user
    assert "hashed_password" in user

    delete_user(user["id"])


def test_create_user_duplicate_directly():
    email = unique_email("direct-duplicate")
    password = "test-password-123"

    first = create_user(
        email=email,
        password=password,
    )

    assert first is not None

    second = create_user(
        email=email,
        password=password,
    )

    assert second is None

    delete_user(first["id"])


def test_get_user_by_email():
    email = unique_email("get-email")
    password = "test-password-123"

    user = create_user(
        email=email,
        password=password,
    )

    assert user is not None

    found = get_user_by_email(email)

    assert found is not None
    assert found["id"] == user["id"]
    assert found["email"] == email

    delete_user(user["id"])


def test_get_user_by_email_not_found():
    email = unique_email("missing-email")

    result = get_user_by_email(email)

    assert result is None


def test_get_user_by_id():
    email = unique_email("get-id")
    password = "test-password-123"

    user = create_user(
        email=email,
        password=password,
    )

    assert user is not None

    found = get_user_by_id(user["id"])

    assert found is not None
    assert found["id"] == user["id"]
    assert found["email"] == email

    delete_user(user["id"])


def test_get_user_by_id_not_found():
    result = get_user_by_id(999999999)

    assert result is None


def test_update_user_without_password():
    email = unique_email("update-user")
    password = "test-password-123"

    user = create_user(
        email=email,
        password=password,
    )

    assert user is not None

    updated = update_user(
        user["id"],
        {
            "role": "admin",
            "is_active": False,
        },
    )

    assert updated is not None
    assert updated["id"] == user["id"]
    assert updated["email"] == email
    assert updated["role"] == "admin"
    assert updated["is_active"] is False

    delete_user(user["id"])


def test_update_user_with_password():
    email = unique_email("update-password")
    old_password = "test-password-123"
    new_password = "new-password-456"

    user = create_user(
        email=email,
        password=old_password,
    )

    assert user is not None

    old_hash = user["hashed_password"]

    updated = update_user(
        user["id"],
        {
            "password": new_password,
        },
    )

    assert updated is not None
    assert updated["id"] == user["id"]
    assert updated["hashed_password"] != old_hash

    delete_user(user["id"])


def test_update_user_not_found():
    result = update_user(
        999999999,
        {
            "role": "admin",
        },
    )

    assert result is None


def test_delete_user():
    email = unique_email("delete-user")
    password = "test-password-123"

    user = create_user(
        email=email,
        password=password,
    )

    assert user is not None

    user_id = user["id"]

    result = delete_user(user_id)

    assert result is True
    assert get_user_by_id(user_id) is None


def test_delete_user_not_found():
    result = delete_user(999999999)

    assert result is False