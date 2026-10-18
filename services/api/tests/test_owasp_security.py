"""
tests/test_owasp_security.py — Suite de Pruebas Automatizadas OWASP Top 10
Módulo: Secure AI Applications
Proyecto: Auditoría y Corrección de Vulnerabilidades Web (OWASP Top 10)

Cubre:
- A01: Broken Access Control (VULN-01, VULN-02, VULN-03, VULN-04, VULN-05)
- A02: Cryptographic Failures & Password Policy (VULN-11 / A07)
- A03: Injection & XSS (VULN-06, VULN-07)
- A04: Insecure Design & Rate Limiting (VULN-08)
- A05: Security Misconfiguration & HTTP Headers (VULN-10)
- A07: Identification and Authentication Failures (VULN-08, VULN-11)
- A09: Security Logging & Monitoring Failures (VULN-09)
"""

import uuid
import pytest
from fastapi.testclient import TestClient

from main import app
from database import users_table, profiles_table
from core.security import (
    rate_limiter,
    sanitize_html,
    sanitize_csv_cell,
    log_security_event,
)
from services.auth_service import hash_password


@pytest.fixture(scope="module")
def client():
    """Cliente de pruebas HTTP para la aplicación FastAPI."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def clean_rate_limiter():
    """Limpia el estado del rate limiter antes de cada test."""
    rate_limiter.reset()
    yield
    rate_limiter.reset()


def create_test_user(client: TestClient, role: str = "user"):
    """Helper para registrar o insertar un usuario y retornar token y datos."""
    uid = uuid.uuid4().hex[:8]
    email = f"test_{uid}@trackflow.security"
    raw_password = f"P@ssword{uid}123!"

    if role == "admin":
        user_id = users_table.insert({
            "email": email,
            "hashed_password": hash_password(raw_password),
            "role": "admin",
            "is_active": True,
            "created_at": "2026-10-18T00:00:00Z"
        })
        profiles_table.insert({"user_id": user_id, "name": f"Admin {uid}"})
    else:
        resp = client.post("/users/", json={
            "email": email,
            "password": raw_password,
            "name": f"User {uid}"
        })
        assert resp.status_code == 200
        user_id = resp.json()["id"]

    login_resp = client.post("/auth/login", json={"email": email, "password": raw_password})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    return {
        "id": user_id,
        "email": email,
        "token": token,
        "headers": headers,
        "role": role,
    }


# =====================================================================
# 1. OWASP A05: Security Misconfiguration (Cabeceras de Endurecimiento)
# =====================================================================

def test_security_headers_injected(client):
    """Verifica que el middleware inyecta todas las cabeceras HTTP de protección."""
    resp = client.get("/health")
    assert resp.status_code == 200
    headers = resp.headers

    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-xss-protection") == "1; mode=block"
    assert "default-src 'self'" in headers.get("content-security-policy", "")
    assert "frame-ancestors 'none'" in headers.get("content-security-policy", "")
    assert "strict-origin" in headers.get("referrer-policy", "")
    assert "geolocation=()" in headers.get("permissions-policy", "")
    assert "max-age=31536000" in headers.get("strict-transport-security", "")


# =====================================================================
# 2. OWASP A07 / A02: Robustez de Contraseñas (Password Policy)
# =====================================================================

def test_password_policy_min_length(client):
    """Rechaza contraseñas con longitud menor a 8 caracteres."""
    resp = client.post("/users/", json={
        "email": f"short_{uuid.uuid4().hex[:6]}@sec.com",
        "password": "123",
        "name": "Short Password"
    })
    assert resp.status_code == 400
    assert "at least 8 characters" in str(resp.json())


def test_password_policy_requires_alphanumeric(client):
    """Rechaza contraseñas compuestas solo por letras o solo por números."""
    resp_letters = client.post("/users/", json={
        "email": f"letters_{uuid.uuid4().hex[:6]}@sec.com",
        "password": "onlylettersandnosymbol",
        "name": "Only Letters"
    })
    assert resp_letters.status_code == 400
    assert "al menos una letra y un número" in str(resp_letters.json())

    resp_numbers = client.post("/users/", json={
        "email": f"nums_{uuid.uuid4().hex[:6]}@sec.com",
        "password": "1234567890123",
        "name": "Only Numbers"
    })
    assert resp_numbers.status_code == 400
    assert "al menos una letra y un número" in str(resp_numbers.json())


# =====================================================================
# 3. OWASP A01: Broken Access Control (VULN-01 a VULN-05)
# =====================================================================

def test_public_registration_blocks_role_escalation(client):
    """VULN-01: Registro público ignora payload con role='admin' y asigna 'user'."""
    email = f"attacker_{uuid.uuid4().hex[:6]}@sec.com"
    resp = client.post("/users/", json={
        "email": email,
        "password": "StrongPassword123!",
        "name": "Attacker",
        "role": "admin"  # Intento malicioso
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "user", "VULN-01 detectada: el atacante pudo asignarse rol admin!"


def test_user_enumeration_blocked_for_normal_users(client):
    """VULN-02: Usuario común no puede listar todos los usuarios (403 Forbidden)."""
    normal_user = create_test_user(client, role="user")
    resp = client.get("/users/", headers=normal_user["headers"])
    assert resp.status_code == 403


def test_user_enumeration_allowed_for_admins(client):
    """VULN-02: Usuario administrador sí tiene permiso para listar usuarios."""
    admin_user = create_test_user(client, role="admin")
    resp = client.get("/users/", headers=admin_user["headers"])
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_idor_blocked_on_user_profile(client):
    """VULN-03: Usuario común no puede inspeccionar datos de otro usuario por ID."""
    user_a = create_test_user(client, role="user")
    user_b = create_test_user(client, role="user")

    # user_a intenta ver perfil de user_b
    resp = client.get(f"/users/{user_b['id']}", headers=user_a["headers"])
    assert resp.status_code == 403

    # user_a sí puede ver su propio perfil
    resp_own = client.get(f"/users/{user_a['id']}", headers=user_a["headers"])
    assert resp_own.status_code == 200
    assert resp_own.json()["email"] == user_a["email"]


def test_self_privilege_escalation_blocked_via_put(client):
    """VULN-04: Usuario común no puede alterar su propio rol a 'admin' mediante PUT."""
    user = create_test_user(client, role="user")
    resp = client.put(f"/users/{user['id']}", headers=user["headers"], json={"role": "admin"})
    assert resp.status_code == 403


def test_supplier_deletion_requires_admin(client):
    """VULN-05: Eliminación de proveedores protegida para rol admin exclusivamente."""
    user = create_test_user(client, role="user")
    resp_user = client.delete("/suppliers/9999", headers=user["headers"])
    assert resp_user.status_code == 403

    admin = create_test_user(client, role="admin")
    resp_admin = client.delete("/suppliers/9999", headers=admin["headers"])
    # Debe ser procesado (200, 204 o 404), pero jamás 403 Forbidden
    assert resp_admin.status_code != 403


# =====================================================================
# 4. OWASP A03: Injection & XSS (VULN-06 & VULN-07)
# =====================================================================

def test_stored_xss_sanitization_in_incidents(client):
    """VULN-06: Sanitización de etiquetas HTML maliciosas en creación de incidencias."""
    user = create_test_user(client, role="user")
    resp = client.post("/api/incidents/", headers=user["headers"], json={
        "title": "<script>alert('pwned')</script>Phishing Attack",
        "description": "<img src=x onerror=alert(1)>Body with <a href='javascript:exploit()'>link</a>",
        "category": "system_failure",
        "branch": "central",
        "origin": "customer"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "<script>" not in data["title"]
    assert "&lt;script&gt;" in data["title"]
    assert "<img" not in data["description"]
    assert "javascript:" not in data["description"]


def test_csv_formula_injection_escaping():
    """VULN-07: Comprobación de neutralización de inyección de fórmulas CSV."""
    dangerous_inputs = [
        "=SUM(A1:A10)",
        "+1234567890",
        "-5000000000",
        "@SUM(1+1)",
        "\tMALICIOUS",
        "\rCOMMAND",
    ]
    for raw in dangerous_inputs:
        sanitized = sanitize_csv_cell(raw)
        assert sanitized.startswith("'"), f"Fallo al escapar fórmula: {raw}"

    # Entradas seguras permanecen intactas
    assert sanitize_csv_cell("Normal Text") == "Normal Text"
    assert sanitize_csv_cell(123) == "123"
    assert sanitize_csv_cell(None) == ""


# =====================================================================
# 5. OWASP A04 & A07: Rate Limiting y Bloqueo Anti-Brute Force (VULN-08)
# =====================================================================

def test_rate_limiting_login_endpoint(client):
    """VULN-08: Limita a 5 peticiones por minuto el endpoint POST /auth/login."""
    rate_limiter.reset()

    for _ in range(5):
        r = client.post("/auth/login", json={"email": "nonexistent@test.com", "password": "wrong"})
        assert r.status_code in (401, 404, 400)

    # 6ª petición debe ser bloqueada por rate limit
    blocked = client.post("/auth/login", json={"email": "nonexistent@test.com", "password": "wrong"})
    assert blocked.status_code == 429
    assert "retry-after" in blocked.headers
    assert int(blocked.headers["retry-after"]) > 0
    assert "Demasiados intentos" in blocked.json()["detail"]


# =====================================================================
# 6. OWASP A09: Security Logging & Monitoring (VULN-09)
# =====================================================================

def test_structured_security_logging(caplog):
    """VULN-09: Verifica que los eventos de seguridad se registran con formato estructurado."""
    import logging
    with caplog.at_level(logging.WARNING, logger="security.audit"):
        log_security_event(
            event_type="TEST_SECURITY_BREACH_DETECTED",
            client_ip="192.168.1.100",
            details="Intento de acceso no autorizado detectado en test",
            user_identifier="malicious_actor",
            success=False
        )

    assert any("TEST_SECURITY_BREACH_DETECTED" in record.message for record in caplog.records)
    assert any("192.168.1.100" in record.message for record in caplog.records)
    assert any("malicious_actor" in record.message for record in caplog.records)
