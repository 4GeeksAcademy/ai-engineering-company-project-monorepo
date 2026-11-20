"""
tests/test_mcp_server.py
Suite de pruebas de integración, seguridad OAuth 2.1 y Red Teaming para el Servidor MCP.
"""
import os
import sys
import asyncio
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from starlette.testclient import TestClient

from mcps.company_tools.server import app, mcp
from mcps.company_tools.config import settings
from mcps.company_tools.auth import create_access_token, mcp_auth


@pytest.fixture
def client():
    """Cliente de pruebas ASGI para el servidor MCP."""
    return TestClient(app)


@pytest.fixture
def full_access_token():
    """Token JWT con todos los scopes válidos."""
    return create_access_token(
        client_id="test-admin-client",
        scopes=settings.supported_scopes,
    )


@pytest.fixture
def read_only_token():
    """Token JWT limitado únicamente a lectura de incidencias."""
    return create_access_token(
        client_id="test-readonly-client",
        scopes=[settings.scope_incidents_read],
    )


# =====================================================================
# 1. PRUEBAS DE AUTENTICACIÓN Y DISCOVERY (OAUTH 2.1)
# =====================================================================

def test_health_endpoint(client):
    """Verifica que el healthcheck responda sin requerir autenticación."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "OAuth 2.1" in data["auth"]


def test_protected_resource_metadata_rfc9470(client):
    """Verifica la publicación de metadatos de recurso protegido RFC 9470."""
    res = client.get("/.well-known/oauth-protected-resource")
    assert res.status_code == 200
    data = res.json()
    assert "authorization_servers" in data
    assert settings.oauth_issuer in data["authorization_servers"]
    assert settings.scope_incidents_read in data["scopes_supported"]


def test_unauthenticated_request_rejected(client):
    """Ataque 1: Petición anónima a /sse debe rechazarse con 401 Unauthorized."""
    res = client.get("/sse")
    assert res.status_code == 401
    data = res.json()
    assert data.get("error") == "missing_auth_header"


def test_invalid_token_rejected(client):
    """Ataque 2: Token manipulado o firma corrupta debe rechazarse con 401."""
    res = client.get("/sse", headers={"Authorization": "Bearer token_falso_invalido_12345"})
    assert res.status_code == 401
    data = res.json()
    assert data.get("error") in ["invalid_token", "invalid_bearer_token"]


def test_auth_token_endpoint_not_publicly_accessible(client):
    """Verifica que /auth/token no esté expuesto públicamente sin autenticación."""
    res = client.get("/auth/token?client_id=tester-1")
    assert res.status_code == 401

def test_cannot_list_tools_without_oauth_token(client):
    """Sin access token OAuth válido, un cliente NO puede listar tools (tools/list)."""
    payload = {"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
    for endpoint in ("/mcp", "/messages"):
        res = client.post(endpoint, json=payload)
        assert res.status_code == 401
        assert res.json().get("error") == "missing_auth_header"

def test_cannot_call_tools_without_oauth_token(client):
    """Sin access token OAuth válido, un cliente NO puede ejecutar ninguna tool (tools/call)."""
    payload = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {"name": "inventory_query_stock", "arguments": {}},
    }
    for endpoint in ("/mcp", "/messages"):
        res = client.post(endpoint, json=payload)
        assert res.status_code == 401
        assert res.json().get("error") == "missing_auth_header"

# =====================================================================
# 2. PRUEBAS DE TOOLS DE INCIDENCIAS Y MÁQUINA DE ESTADOS
# =====================================================================

def test_incidents_create_and_lifecycle():
    """
    Verifica la creación y transición de ciclo de vida de incidencias
    respetando la máquina de estados: open -> in_progress -> resolved.
    """
    async def _run():
        from mcps.company_tools.tools_incidents import register_incident_tools
        from fastmcp import FastMCP

        test_mcp = FastMCP("test_incidents")
        register_incident_tools(test_mcp)

        token = create_access_token(client_id="incident-manager", scopes=[settings.scope_incidents_write, settings.scope_incidents_read])
        from mcps.company_tools.auth import verify_access_token
        verified_auth = verify_access_token(token)
        mcp_auth._context_var.set(verified_auth)

        # Crear incidencia
        call_res = await test_mcp.call_tool("incidents_create", arguments={
            "title": "Fallo crítico en terminal de ventas",
            "description": "El lector de tarjetas de la sucursal central no responde tras reinicio.",
            "category": "fallo_operativo",
            "branch": "central",
            "origin": "branch",
        })
        create_res = call_res.structured_content
        assert create_res.get("status") == "success"
        ticket = create_res.get("incident", {})
        ticket_id = ticket.get("id")
        assert ticket.get("status") == "open"

        # Transición válida 1: open -> in_progress
        call_step1 = await test_mcp.call_tool("incidents_update_status", arguments={"ticket_id": ticket_id, "new_status": "in_progress"})
        step1_res = call_step1.structured_content
        assert step1_res.get("status") == "success"
        assert step1_res.get("incident", {}).get("status") == "in_progress"

        # Transición válida 2: in_progress -> resolved
        call_step2 = await test_mcp.call_tool("incidents_update_status", arguments={"ticket_id": ticket_id, "new_status": "resolved"})
        step2_res = call_step2.structured_content
        assert step2_res.get("status") == "success"
        assert step2_res.get("incident", {}).get("status") == "resolved"

        # Transición inválida: resolved -> open (Debe ser rechazada)
        call_inv = await test_mcp.call_tool("incidents_update_status", arguments={"ticket_id": ticket_id, "new_status": "open"})
        invalid_res = call_inv.structured_content
        assert invalid_res.get("error") == "invalid_transition"
        assert "Transición no permitida" in invalid_res.get("message", "")

    asyncio.run(_run())


def test_scope_enforcement_read_cannot_write():
    """
    Ataque 3: Principio de Mínimo Privilegio.
    Un cliente con scope exclusivo 'incidents:read' debe ser bloqueado con 403
    si intenta ejecutar una tool de escritura ('incidents_create').
    """
    async def _run():
        from mcps.company_tools.tools_incidents import register_incident_tools
        from fastmcp import FastMCP
        from fastmcp.exceptions import ToolError
        from mcps.company_tools.auth import verify_access_token

        test_mcp = FastMCP("test_scopes")
        register_incident_tools(test_mcp)

        readonly_token = create_access_token(client_id="auditor-client", scopes=[settings.scope_incidents_read])
        verified_auth = verify_access_token(readonly_token)
        mcp_auth._context_var.set(verified_auth)

        with pytest.raises((PermissionError, ToolError)) as exc_info:
            await test_mcp.call_tool("incidents_create", arguments={
                "title": "Intento no autorizado de creación",
                "description": "Este ticket no debería poder ser creado por falta de scopes.",
            })

        err_text = str(exc_info.value)
        assert "403 Forbidden" in err_text or "incidents:write" in err_text

    asyncio.run(_run())


def test_inventory_query_stock_success():
    """Verifica que la consulta legítima de inventario responda con datos de stock."""
    async def _run():
        from mcps.company_tools.tools_inventory import register_inventory_tools
        from fastmcp import FastMCP
        from mcps.company_tools.auth import verify_access_token

        test_mcp = FastMCP("test_inv")
        register_inventory_tools(test_mcp)

        token = create_access_token(client_id="inventory-viewer", scopes=[settings.scope_inventory_read])
        mcp_auth._context_var.set(verify_access_token(token))

        call_res = await test_mcp.call_tool("inventory_query_stock", arguments={})
        res = call_res.structured_content
        assert res.get("status") == "success"
        assert "products" in res
        assert isinstance(res["products"], list)

    asyncio.run(_run())


def test_inventory_write_attempt_explicitly_rejected():
    """
    Ataque 4 (Red Teaming): Intento de mutación sobre la tool de inventario.
    El servidor DEBE interceptar y rechazar explícitamente cualquier acción de escritura con 403.
    """
    async def _run():
        from mcps.company_tools.tools_inventory import register_inventory_tools
        from fastmcp import FastMCP
        from mcps.company_tools.auth import verify_access_token

        test_mcp = FastMCP("test_inv_guard")
        register_inventory_tools(test_mcp)

        token = create_access_token(client_id="malicious-client", scopes=[settings.scope_inventory_read])
        mcp_auth._context_var.set(verify_access_token(token))

        # 1. Intento de inyectar acción de modificación en query_stock
        call1 = await test_mcp.call_tool("inventory_query_stock", arguments={"action": "update", "quantity": 50})
        res1 = call1.structured_content
        assert res1.get("error") == "forbidden_write_operation"
        assert res1.get("status_code") == 403
        assert "SOLO LECTURA por diseño" in res1.get("message", "")

        # 2. Intento de llamar a la tool defensiva de modificación
        call2 = await test_mcp.call_tool("inventory_modify_stock", arguments={"asset_id": 1, "quantity": 10})
        res2 = call2.structured_content
        assert res2.get("error") == "forbidden_write_operation"
        assert res2.get("status_code") == 403
        assert "Operación de escritura rechazada" in res2.get("message", "")

    asyncio.run(_run())