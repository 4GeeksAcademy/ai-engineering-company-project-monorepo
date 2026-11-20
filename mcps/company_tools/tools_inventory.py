"""
Herramientas MCP para el Módulo de Inventario de Nexova Solutions.
Operaciones estrictamente de SOLO LECTURA con rechazo explícito y trazable de cualquier mutación.
"""
import logging
from typing import Dict, Any, Optional, List
import httpx
from sqlmodel import Session, select

from fastmcp import FastMCP
from services.api.database import engine
from services.api.models import Asset
from services.api.routes.inventory import calculate_stock
from mcps.company_tools.config import settings
from mcps.company_tools.auth import check_tool_scope, log_tool_invocation, mcp_auth

logger = logging.getLogger("nexova.mcp_inventory")

# Parámetros y acciones de escritura que activan la guardia de rechazo
PROHIBITED_WRITE_ACTIONS = {"write", "update", "delete", "create", "insert", "modify", "patch", "set_stock"}


def register_inventory_tools(mcp: FastMCP) -> None:
    """Registra las tools de inventario y la guardia de solo lectura en FastMCP."""

    @mcp.tool(
        name="inventory_query_stock",
        description=(
            "Consulta el catálogo de activos, productos y existencias en tiempo real de Nexova Solutions. "
            "Permite filtrar por SKU, ID de producto o departamento. "
            "OPERACIÓN ESTRICTAMENTE DE SOLO LECTURA. Cualquier intento de escritura o mutación "
            "será rechazado explícitamente con código 403 Forbidden. "
            "Requiere el scope OAuth 'inventory:read'."
        ),
    )
    async def inventory_query_stock(
        product_id: Optional[int] = None,
        sku: Optional[str] = None,
        department: Optional[str] = None,
        action: Optional[str] = None,
        quantity: Optional[int] = None,
        operation: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Args:
            product_id: ID numérico del activo a consultar (opcional).
            sku: Código de referencia SKU del activo (opcional).
            department: Departamento asignado para filtrar (opcional).
            action: Campo de acción. Si se solicita cualquier mutación, será rechazado.
            quantity: Cantidad. Si se proporciona, se considera un intento de mutación y se rechaza.
            operation: Tipo de operación intentada.

        Returns:
            Dict con la lista o detalle de productos y su stock disponible.
        """
        tool_name = "inventory_query_stock"
        auth_info = check_tool_scope(settings.scope_inventory_read, tool_name)
        client_id = auth_info.client_id or "anonymous"

        # 🛡️ GUARDIA DE SEGURIDAD 1: Rechazo explícito de cualquier intento de escritura
        is_write_action = action and action.strip().lower() in PROHIBITED_WRITE_ACTIONS
        is_write_attempt = (
            is_write_action
            or (operation and operation.strip().lower() in PROHIBITED_WRITE_ACTIONS)
            or (quantity is not None)
        )

        if is_write_attempt:
            rejection_details = {
                "attempted_action": action or operation,
                "quantity": quantity,
                "reason": "Intento de mutación detectado en endpoint de solo lectura",
            }
            log_tool_invocation(tool_name, client_id, "WRITE_OPERATION_REJECTED", rejection_details)
            return {
                "error": "forbidden_write_operation",
                "status_code": 403,
                "message": (
                    "Violación de Seguridad (403 Forbidden): El módulo de inventario de Nexova Solutions "
                    "es estrictamente de SOLO LECTURA por diseño arquitectónico. "
                    "Cualquier intento de modificación, actualización o eliminación está terminantemente prohibido."
                ),
            }

        # 1. Intentar consulta vía HTTP al backend si está disponible
        try:
            async with httpx.AsyncClient(timeout=settings.backend_timeout) as client:
                url = f"{settings.backend_api_url}/inventory/products"
                if product_id is not None:
                    url = f"{url}/{product_id}"

                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    log_tool_invocation(tool_name, client_id, "SUCCESS", {"filter": {"product_id": product_id, "sku": sku}})
                    return {"status": "success", "products": data if isinstance(data, list) else [data]}
        except Exception:
            logger.debug("Backend HTTP no disponible, consultando base de datos local de inventario...")

        # 2. Resiliencia: consulta directa sobre SQLite / SQLModel
        try:
            with Session(engine) as session:
                if product_id is not None:
                    asset = session.get(Asset, product_id)
                    if not asset:
                        log_tool_invocation(tool_name, client_id, "NOT_FOUND", {"product_id": product_id})
                        return {"error": "not_found", "message": f"Activo con ID {product_id} no encontrado."}
                    
                    stock = calculate_stock(session, asset.id)
                    result = [{
                        "id": asset.id,
                        "name": asset.name,
                        "sku": asset.sku,
                        "department": asset.department,
                        "current_stock": stock,
                    }]
                else:
                    query = select(Asset)
                    if sku:
                        query = query.where(Asset.sku == sku.strip())
                    if department:
                        query = query.where(Asset.department == department.strip())

                    assets = session.exec(query).all()
                    result = [
                        {
                            "id": a.id,
                            "name": a.name,
                            "sku": a.sku,
                            "department": a.department,
                            "current_stock": calculate_stock(session, a.id),
                        }
                        for a in assets
                    ]

            log_tool_invocation(tool_name, client_id, "SUCCESS", {"count": len(result)})
            return {"status": "success", "count": len(result), "products": result}

        except Exception as exc:
            logger.error(f"Error al consultar base de datos de inventario: {exc}")
            log_tool_invocation(tool_name, client_id, "DATABASE_ERROR", {"error": str(exc)})
            return {"error": "database_error", "message": f"Error al consultar inventario: {str(exc)}"}

    @mcp.tool(
        name="inventory_modify_stock",
        description=(
            "ATENCIÓN: Herramienta defensiva para detectar intentos no autorizados de edición. "
            "Cualquier invocación responderá con rechazo explícito (403 Forbidden). "
            "El inventario de Nexova Solutions es exclusivamente de solo lectura."
        ),
    )
    async def inventory_modify_stock(
        asset_id: int,
        quantity: int,
        operation: str = "update",
    ) -> Dict[str, Any]:
        """
        Rechaza categóricamente cualquier intento explícito de mutación.
        """
        tool_name = "inventory_modify_stock"
        auth_info = mcp_auth.auth_info
        client_id = auth_info.client_id if auth_info else "anonymous"

        log_tool_invocation(
            tool_name,
            client_id,
            "WRITE_OPERATION_REJECTED",
            {"asset_id": asset_id, "quantity": quantity, "operation": operation},
        )

        return {
            "error": "forbidden_write_operation",
            "status_code": 403,
            "message": (
                "Acceso Denegado (403 Forbidden): Operación de escritura rechazada. "
                "Por política de seguridad y diseño de Nexova Solutions, el servidor MCP "
                "no permite operaciones de escritura sobre el módulo de inventario."
            ),
        }