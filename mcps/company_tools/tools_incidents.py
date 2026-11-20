"""
Herramientas MCP para el Gestor de Incidencias de Nexova Solutions.
Expone consulta, creación y actualización de estado según el ciclo de vida del backend.
"""
import logging
from typing import Dict, Any, Optional
import httpx
from tinydb import Query

from fastmcp import FastMCP
from packages.shared.validation import (
    IncidentStatus,
    IncidentCategory,
    IncidentOrigin,
    IncidentBranch,
    IncidentInDB,
    IncidentCreate,
    IncidentUpdateStatus,
)
from services.api.database import get_tinydb
from mcps.company_tools.config import settings
from mcps.company_tools.auth import check_tool_scope, log_tool_invocation

logger = logging.getLogger("nexova.mcp_incidents")

# Matriz oficial de transiciones válidas de estado en Nexova Solutions
VALID_TRANSITIONS = {
    IncidentStatus.open.value: [IncidentStatus.in_progress.value, IncidentStatus.discarded.value],
    IncidentStatus.in_progress.value: [IncidentStatus.resolved.value, IncidentStatus.discarded.value],
    IncidentStatus.resolved.value: [],
    IncidentStatus.discarded.value: [],
}


def register_incident_tools(mcp: FastMCP) -> None:
    """Registra las tools de incidentes en el servidor FastMCP con discovery completo."""

    @mcp.tool(
        name="incidents_get_status",
        description=(
            "Consulta el estado y los detalles de un ticket de soporte o incidencia en Nexova Solutions. "
            "Permite buscar por el identificador UUID exacto del ticket o por coincidencia en el título. "
            "Operación de lectura. Requiere el scope OAuth 'incidents:read'."
        ),
    )
    async def incidents_get_status(ticket_id: str) -> Dict[str, Any]:
        """
        Args:
            ticket_id: Identificador único (UUID) de la incidencia o número de ticket.
        Returns:
            Dict con los datos de la incidencia (id, title, description, status, category, branch, origin,
            created_at, updated_at).
        """
        tool_name = "incidents_get_status"
        auth_info = check_tool_scope(settings.scope_incidents_read, tool_name)
        client_id = auth_info.client_id or "anonymous"

        clean_id = ticket_id.strip()
        if not clean_id:
            log_tool_invocation(tool_name, client_id, "VALIDATION_ERROR", {"error": "ticket_id vacío"})
            return {"error": "validation_error", "message": "El identificador del ticket no puede estar vacío."}

        # 1. Intentar consulta vía HTTP al backend principal si está activo
        try:
            async with httpx.AsyncClient(timeout=settings.backend_timeout) as client:
                res = await client.get(f"{settings.backend_api_url}/api/incidents/{clean_id}")
                if res.status_code == 200:
                    data = res.json()
                    log_tool_invocation(tool_name, client_id, "SUCCESS", {"ticket_id": clean_id, "source": "api"})
                    return {"status": "success", "incident": data}
        except Exception:
            logger.debug("Backend HTTP no disponible, consultando base de datos local...")

        # 2. Resiliencia: consulta directa a TinyDB
        db = get_tinydb()
        incidents_table = db.table("incidents")
        IncidentQ = Query()

        results = incidents_table.search(IncidentQ.id == clean_id)
        if not results:
            results = incidents_table.search(
                IncidentQ.title.test(lambda t: clean_id.lower() in str(t).lower())
            )

        if not results:
            log_tool_invocation(tool_name, client_id, "NOT_FOUND", {"ticket_id": clean_id})
            return {
                "error": "not_found",
                "message": f"Incidencia con identificador o título '{clean_id}' no encontrada en el sistema.",
            }

        incident = results[0]
        log_tool_invocation(tool_name, client_id, "SUCCESS", {"ticket_id": clean_id, "source": "tinydb"})
        return {"status": "success", "incident": incident}

    @mcp.tool(
        name="incidents_create",
        description=(
            "Crea una nueva incidencia o ticket de soporte en Nexova Solutions. "
            "El ticket se inicializa automáticamente en estado 'open'. "
            "Operación de escritura. Requiere el scope OAuth 'incidents:write'."
        ),
    )
    async def incidents_create(
        title: str,
        description: str,
        category: str = "fallo_operativo",
        origin: str = "customer",
        branch: str = "central",
    ) -> Dict[str, Any]:
        """
        Args:
            title: Título descriptivo del incidente (5 a 150 caracteres).
            description: Detalle completo del problema (20 a 1000 caracteres).
            category: Categoría ('fallo_operativo', 'queja', 'solicitud').
            origin: Origen del ticket ('customer', 'branch', 'internal').
            branch: Sucursal afectada ('valencia', 'miami', 'central').

        Returns:
            Dict con los datos del ticket creado y su identificador asignado.
        """
        tool_name = "incidents_create"
        auth_info = check_tool_scope(settings.scope_incidents_write, tool_name)
        client_id = auth_info.client_id or "anonymous"

        # Validación de modelos y enums de dominio
        try:
            valid_category = IncidentCategory(category)
            valid_origin = IncidentOrigin(origin)
            valid_branch = IncidentBranch(branch)
            incident_data = IncidentCreate(
                title=title,
                description=description,
                category=valid_category,
                origin=valid_origin,
                branch=valid_branch,
            )
        except Exception as exc:
            log_tool_invocation(tool_name, client_id, "VALIDATION_ERROR", {"error": str(exc)})
            return {"error": "validation_error", "message": f"Datos de incidencia inválidos: {str(exc)}"}

        # 1. Intentar creación vía HTTP en backend
        try:
            async with httpx.AsyncClient(timeout=settings.backend_timeout) as client:
                res = await client.post(
                    f"{settings.backend_api_url}/api/incidents",
                    json=incident_data.model_dump(),
                )
                if res.status_code in [200, 201]:
                    record = res.json()
                    log_tool_invocation(tool_name, client_id, "SUCCESS", {"ticket_id": record.get("id"), "source": "api"})
                    return {"status": "success", "incident": record}
        except Exception:
            logger.debug("Backend HTTP no disponible, insertando en base de datos local...")

        # 2. Resiliencia: inserción directa en TinyDB
        db = get_tinydb()
        incidents_table = db.table("incidents")
        db_record = IncidentInDB(**incident_data.model_dump())
        incidents_table.insert(db_record.model_dump())

        log_tool_invocation(tool_name, client_id, "SUCCESS", {"ticket_id": db_record.id, "source": "tinydb"})
        return {"status": "success", "incident": db_record.model_dump()}

    @mcp.tool(
        name="incidents_update_status",
        description=(
            "Actualiza el estado de ciclo de vida de un ticket de soporte existente en Nexova Solutions. "
            "Equivale al endpoint PATCH /api/incidents/{id}/status. "
            "Transiciones válidas: 'open' -> ['in_progress', 'discarded']; 'in_progress' -> ['resolved', 'discarded']. "
            "Operación de escritura. Requiere el scope OAuth 'incidents:write'."
        ),
    )
    async def incidents_update_status(ticket_id: str, new_status: str) -> Dict[str, Any]:
        """
        Args:
            ticket_id: Identificador UUID de la incidencia a actualizar.
            new_status: Nuevo estado deseado ('open', 'in_progress', 'resolved', 'discarded').

        Returns:
            Dict confirmando la actualización con el registro actualizado.
        """
        tool_name = "incidents_update_status"
        auth_info = check_tool_scope(settings.scope_incidents_write, tool_name)
        client_id = auth_info.client_id or "anonymous"

        clean_id = ticket_id.strip()
        clean_status = new_status.strip().lower()

        # Validar que el nuevo estado sea reconocido en el dominio
        try:
            target_status = IncidentStatus(clean_status)
        except ValueError:
            valid_names = [e.value for e in IncidentStatus]
            log_tool_invocation(tool_name, client_id, "INVALID_STATUS", {"status": new_status})
            return {
                "error": "invalid_status",
                "message": f"Estado '{new_status}' no reconocido. Estados válidos: {valid_names}",
            }

        # 1. Intentar actualización vía HTTP PATCH /api/incidents/{id}/status
        try:
            async with httpx.AsyncClient(timeout=settings.backend_timeout) as client:
                res = await client.patch(
                    f"{settings.backend_api_url}/api/incidents/{clean_id}/status",
                    json={"status": target_status.value},
                )
                if res.status_code == 200:
                    data = res.json()
                    log_tool_invocation(tool_name, client_id, "SUCCESS", {"ticket_id": clean_id, "new_status": target_status.value})
                    return {"status": "success", "incident": data}
                elif res.status_code == 400:
                    error_detail = res.json().get("detail", "Transición no válida")
                    log_tool_invocation(tool_name, client_id, "INVALID_TRANSITION", {"error": error_detail})
                    return {"error": "invalid_transition", "message": error_detail}
        except Exception:
            logger.debug("Backend HTTP no disponible, aplicando transición en base de datos local...")

        # 2. Resiliencia: validación y transición directa en TinyDB
        db = get_tinydb()
        incidents_table = db.table("incidents")
        IncidentQ = Query()
        results = incidents_table.search(IncidentQ.id == clean_id)

        if not results:
            log_tool_invocation(tool_name, client_id, "NOT_FOUND", {"ticket_id": clean_id})
            return {"error": "not_found", "message": f"Incidencia '{clean_id}' no encontrada."}

        current_record = results[0]
        current_status = current_record.get("status")

        if current_status == target_status.value:
            log_tool_invocation(tool_name, client_id, "NO_OP", {"ticket_id": clean_id, "status": current_status})
            return {"status": "success", "incident": current_record, "message": "El ticket ya se encontraba en ese estado."}

        allowed_next = VALID_TRANSITIONS.get(current_status, [])
        if target_status.value not in allowed_next:
            error_msg = (
                f"Transición no permitida: No se puede cambiar de '{current_status}' a '{target_status.value}'. "
                f"Estados alcanzables desde '{current_status}': {allowed_next}."
            )
            log_tool_invocation(tool_name, client_id, "INVALID_TRANSITION", {"error": error_msg})
            return {"error": "invalid_transition", "message": error_msg}

        incidents_table.update({"status": target_status.value}, IncidentQ.id == clean_id)
        updated_record = incidents_table.search(IncidentQ.id == clean_id)[0]

        log_tool_invocation(
            tool_name,
            client_id,
            "SUCCESS",
            {"ticket_id": clean_id, "from": current_status, "to": target_status.value},
        )
        return {"status": "success", "incident": updated_record}