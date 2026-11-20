"""
services/agent/tools.py
Herramientas externas (Tools) para el agente de soporte de Nexova Solutions.
Migrado para consumir exclusivamente el Servidor MCP corporativo vía langchain-mcp-adapters.
"""
import asyncio
import logging
import warnings
from concurrent.futures import ThreadPoolExecutor
from typing import TypedDict, Optional, Dict, Any

from langchain_mcp_adapters.client import MultiServerMCPClient
from mcps.company_tools.config import settings as mcp_settings
from mcps.company_tools.auth import create_access_token

logger = logging.getLogger("nexova.agent_tools")

# Timeout numérico explícito según especificación
DEFAULT_TOOL_TIMEOUT_SECONDS: float = 5.0


class TicketQueryInput(TypedDict):
    """Contrato de entrada para la tool de consulta de incidentes."""
    ticket_id: str


class TicketQueryOutput(TypedDict):
    """Contrato de salida alineado con la API de incidentes y el Servidor MCP."""
    id: str
    title: str
    status: str
    category: str
    origin: str
    branch: str
    created_at: str
    updated_at: str


# =====================================================================
# 1. NUEVA IMPLEMENTACIÓN MCP CLIENT (langchain-mcp-adapters)
# =====================================================================

def get_mcp_client(scopes: Optional[list] = None) -> MultiServerMCPClient:
    """
    Instancia el cliente MultiServerMCPClient de langchain-mcp-adapters
    configurado con el token Bearer autenticado para el agente de soporte.
    """
    token_scopes = scopes or [mcp_settings.scope_incidents_read]
    agent_token = create_access_token(
        client_id="langgraph-support-agent",
        scopes=token_scopes,
        expires_minutes=120,
    )
    
    server_url = f"http://{mcp_settings.server_host}:{mcp_settings.server_port}/sse"
    return MultiServerMCPClient(
        {
            "company_tools": {
                "transport": "sse",
                "url": server_url,
                "headers": {"Authorization": f"Bearer {agent_token}"},
                "timeout": DEFAULT_TOOL_TIMEOUT_SECONDS,
            }
        }
    )


def _format_incident(incident: dict, ticket_identifier: str) -> TicketQueryOutput:
    """Da formato al diccionario de salida del incidente recuperado."""
    return {
        "id": str(incident.get("id", ticket_identifier)),
        "title": str(incident.get("title", "")),
        "status": str(incident.get("status", "desconocido")),
        "category": str(incident.get("category", "general")),
        "origin": str(incident.get("origin", "sistema")),
        "branch": str(incident.get("branch", "central")),
        "created_at": str(incident.get("created_at", "")),
        "updated_at": str(incident.get("updated_at", "")),
    }


async def _async_query_mcp_incident(ticket_identifier: str) -> Optional[TicketQueryOutput]:
    """Descubre e invoca la tool incidents_get_status del Servidor MCP."""
    # 1. Intentar consumo remoto vía langchain-mcp-adapters (SSE)
    try:
        client = get_mcp_client()
        tools = await client.get_tools()
        target_tool = None
        for t in tools:
            if "incidents_get_status" in t.name:
                target_tool = t
                break

        if target_tool:
            result = await target_tool.ainvoke({"ticket_id": ticket_identifier})
            if isinstance(result, dict) and result.get("status") == "success":
                incident = result.get("incident", {})
                return _format_incident(incident, ticket_identifier)
    except Exception as exc:
        logger.debug(f"Servidor MCP remoto en SSE no disponible ({exc}), ejecutando sobre FastMCP...")

    # 2. Resiliencia: si el daemon HTTP del servidor no está corriendo (ej. en tests locales),
    # ejecuta a través de la instancia del Servidor FastMCP en proceso garantizando paso por MCP.
    try:
        from mcps.company_tools.server import mcp
        from mcps.company_tools.auth import create_access_token, verify_access_token, mcp_auth

        token = create_access_token(
            client_id="langgraph-support-agent",
            scopes=[mcp_settings.scope_incidents_read],
        )
        mcp_auth._context_var.set(verify_access_token(token))
        call_res = await mcp.call_tool("incidents_get_status", arguments={"ticket_id": ticket_identifier})
        result = call_res.structured_content
        if isinstance(result, dict) and result.get("status") == "success":
            incident = result.get("incident", {})
            return _format_incident(incident, ticket_identifier)
    except Exception as inner_exc:
        logger.error(f"Error invocando tool en Servidor MCP para '{ticket_identifier}': {inner_exc}")

    return None


def query_incident_via_mcp(
    ticket_identifier: str,
    timeout: float = DEFAULT_TOOL_TIMEOUT_SECONDS,
) -> Optional[TicketQueryOutput]:
    """
    Tool oficial del Agente: Consulta en tiempo real el gestor de incidentes
    a través del Servidor MCP independiente utilizando langchain-mcp-adapters.
    """
    clean_id = ticket_identifier.strip()
    if not clean_id:
        return None

    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(lambda: asyncio.run(_async_query_mcp_incident(clean_id)))
            return future.result(timeout=timeout)
    except Exception as exc:
        logger.warning(f"Fallo o timeout en query_incident_via_mcp ('{clean_id}'): {exc}")
        return None


# =====================================================================
# 2. IMPLEMENTACIÓN ANTERIOR (EXPLÍCITAMENTE DEPRECADA)
# =====================================================================

def get_incident_ticket(
    ticket_identifier: str,
    timeout: float = DEFAULT_TOOL_TIMEOUT_SECONDS,
) -> Optional[TicketQueryOutput]:
    """
    ⚠️ DEPRECADO: Esta función de acceso directo a la base de datos local
    ha sido DEPRECADA formalmente. No debe ser invocada por el grafo del agente.
    Toda consulta debe pasar por 'query_incident_via_mcp()'.
    """
    warnings.warn(
        "get_incident_ticket() está formalmente DEPRECADA para evitar doble camino hacia el Incidents Manager. "
        "Utiliza query_incident_via_mcp() vía Servidor MCP.",
        DeprecationWarning,
        stacklevel=2,
    )
    from tinydb import Query
    from services.api.database import get_tinydb

    clean_id = ticket_identifier.strip()
    if not clean_id:
        return None

    try:
        db = get_tinydb()
        incidents_table = db.table("incidents")
        IncidentQ = Query()
        results = incidents_table.search(IncidentQ.id == clean_id)
        if not results:
            results = incidents_table.search(
                IncidentQ.title.test(lambda t: clean_id.lower() in str(t).lower())
            )
        if not results:
            return None
        record = results[0]
        return {
            "id": str(record.get("id", clean_id)),
            "title": str(record.get("title", "")),
            "status": str(record.get("status", "desconocido")),
            "category": str(record.get("category", "general")),
            "origin": str(record.get("origin", "sistema")),
            "branch": str(record.get("branch", "central")),
            "created_at": str(record.get("created_at", "")),
            "updated_at": str(record.get("updated_at", "")),
        }
    except Exception:
        return None
