"""
server.py — Servidor MCP: Herramientas de la Empresa (TrackFlow)

Expone capacidades de negocio (inventario, productos, proveedores)
a cualquier agente o modelo de Inteligencia Artificial mediante
el protocolo estándar Model Context Protocol (MCP) usando FastMCP.

Incluye guardarraíles de seguridad (Security by Design):
- Validación de entradas con Pydantic
- Límites de impacto (blast radius)
- Separación de lectura frente a mutación
- Consentimiento explícito (dry run / confirm_action)
- Registro de auditoría
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
from mcp.server.fastmcp import FastMCP
from data import PRODUCTS_DB, SUPPLIERS_DB

# 1. Inicialización del Servidor MCP
mcp = FastMCP(
    name="TrackFlow Company Tools",
    instructions="Servidor MCP oficial de TrackFlow. Proporciona herramientas seguras para consultar inventario, catálogo y proveedores de la empresa.",
)

# ─────────────────────────────────────────────────────────────
# MODELOS DE VALIDACIÓN (Pydantic): Guardarraíles de seguridad
# ─────────────────────────────────────────────────────────────

VALID_WAREHOUSES = {"Zaragoza", "Los Angeles"}
MAX_RESTOCK_QUANTITY = 200  # Límite máximo para evitar compras descontroladas por agentes

class RestockOrderRequest(BaseModel):
    sku: str = Field(..., description="Código SKU del producto a reabastecer (ej: TF-ELEC-001)")
    quantity: int = Field(..., gt=0, le=MAX_RESTOCK_QUANTITY, description="Cantidad a ordenar (entre 1 y 200)")
    warehouse: str = Field(..., description="Almacén de destino ('Zaragoza' o 'Los Angeles')")
    reason: str = Field(..., min_length=5, description="Motivo operativo de la solicitud")
    confirm_action: bool = Field(
        False, 
        description="Consentimiento explícito. Si es False, solo genera una previsualización segura sin alterar nada."
    )

    @field_validator("warehouse")
    @classmethod
    def validate_warehouse(cls, v: str) -> str:
        for w in VALID_WAREHOUSES:
            if v.strip().lower() == w.lower():
                return w
        raise ValueError(f"Almacén '{v}' no válido. Almacenes autorizados: {sorted(list(VALID_WAREHOUSES))}")


# Registro de auditoría en memoria (para trazabilidad de acciones)
AUDIT_LOG: List[Dict[str, Any]] = []


# ─────────────────────────────────────────────────────────────
# 2. HERRAMIENTAS DE LECTURA (Read-Only: Bajo riesgo)
# ─────────────────────────────────────────────────────────────

@mcp.tool()
def get_inventory_status(
    warehouse: Optional[str] = None,
    category: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Consulta el estado del inventario de productos en TrackFlow.
    Permite filtrar por ubicación del almacén ('Zaragoza' o 'Los Angeles')
    y por categoría de producto ('Electronics', 'Fashion', 'Cosmetics', 'Home').

    Retorna la lista de productos con su stock actual, umbral mínimo y estado.
    """
    results = PRODUCTS_DB

    if warehouse:
        w_lower = warehouse.strip().lower()
        results = [p for p in results if p["warehouse"].lower() == w_lower]

    if category:
        c_lower = category.strip().lower()
        results = [p for p in results if p["category"].lower() == c_lower]

    return results


@mcp.tool()
def get_product_by_sku(sku: str) -> Dict[str, Any]:
    """
    Busca los detalles de un producto específico mediante su código SKU (ejemplo: 'TF-ELEC-001').

    Retorna los datos completos del producto o un mensaje descriptivo si no se encuentra.
    """
    clean_sku = sku.strip().upper()
    for product in PRODUCTS_DB:
        if product["sku"].upper() == clean_sku:
            return {
                "found": True,
                "product": product,
            }

    return {
        "found": False,
        "message": f"No se encontró ningún producto con el SKU '{sku}'.",
    }


@mcp.tool()
def list_company_suppliers(
    country: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Obtiene el listado de proveedores y empresas de transporte asociadas a TrackFlow.
    Permite filtrar opcionalmente por país de operación ('USA' o 'Spain').

    Retorna los proveedores activos, tarifas por envío y zonas de servicio.
    """
    results = SUPPLIERS_DB

    if country:
        c_lower = country.strip().lower()
        results = [s for s in results if s["country"].lower() == c_lower]

    return results


# ─────────────────────────────────────────────────────────────
# 3. HERRAMIENTA DE ACCIÓN / ESCRITURA (Mutation: Alto riesgo)
#    Aplica: Mínimo privilegio, validación estricta y consentimiento
# ─────────────────────────────────────────────────────────────

@mcp.tool()
def create_restock_order(
    sku: str,
    quantity: int,
    warehouse: str,
    reason: str,
    confirm_action: bool = False,
) -> Dict[str, Any]:
    """
    Solicita una orden de reabastecimiento para un producto en un almacén.

    GUARDARRAÍLES DE SEGURIDAD:
    - Validación de límites: la cantidad debe estar entre 1 y 200 unidades para evitar costes descontrolados.
    - Validación de almacén: solo 'Zaragoza' y 'Los Angeles' están autorizados.
    - Consentimiento explícito: Si confirm_action=False, NO se ejecuta la orden; devuelve
      un desglose previo (Dry-Run) con el coste estimado para confirmación.
    - Trazabilidad: Cada orden confirmada genera un registro de auditoría.
    """
    # 1. Validación defensiva de datos mediante Pydantic
    try:
        validated = RestockOrderRequest(
            sku=sku,
            quantity=quantity,
            warehouse=warehouse,
            reason=reason,
            confirm_action=confirm_action,
        )
    except Exception as err:
        return {
            "success": False,
            "error_type": "ValidationError",
            "message": f"Guardarraíl de seguridad: Datos inválidos. {str(err)}",
        }

    # 2. Verificar existencia del producto
    product = next((p for p in PRODUCTS_DB if p["sku"].upper() == validated.sku.upper()), None)
    if not product:
        return {
            "success": False,
            "error_type": "NotFoundError",
            "message": f"Guardarraíl de seguridad: El SKU '{sku}' no existe en el catálogo de la compañía.",
        }

    # 3. Calcular impacto económico estimado
    estimated_cost_usd = round(product["unit_cost_usd"] * validated.quantity, 2)

    # 4. Consentimiento previo (Human-in-the-loop / Dry Run)
    if not validated.confirm_action:
        return {
            "success": False,
            "status": "pending_confirmation",
            "warning": "ACCIÓN NO EJECUTADA: Se requiere confirmación explícita (confirm_action=True).",
            "preview": {
                "sku": product["sku"],
                "product_name": product["name"],
                "quantity": validated.quantity,
                "target_warehouse": validated.warehouse,
                "current_stock": product["stock_quantity"],
                "estimated_cost_usd": estimated_cost_usd,
                "reason": validated.reason,
            },
            "next_step": "Para confirmar la orden, vuelve a invocar la herramienta con confirm_action=True.",
        }

    # 5. Ejecución segura y registro en auditoría
    order_record = {
        "order_id": f"ORD-RESTOCK-{len(AUDIT_LOG) + 1:04d}",
        "sku": product["sku"],
        "product_name": product["name"],
        "quantity": validated.quantity,
        "warehouse": validated.warehouse,
        "estimated_cost_usd": estimated_cost_usd,
        "reason": validated.reason,
        "status": "approved",
    }
    AUDIT_LOG.append(order_record)

    return {
        "success": True,
        "status": "executed",
        "message": f"Orden de reabastecimiento {order_record['order_id']} generada exitosamente.",
        "order": order_record,
    }


# ─────────────────────────────────────────────────────────────
# 4. RECURSOS (RESOURCES): Contexto de solo lectura para el agente
# ─────────────────────────────────────────────────────────────

@mcp.resource("trackflow://warehouses/overview")
def get_warehouses_overview() -> str:
    """
    Información operativa de los almacenes oficiales de TrackFlow.
    Documento estático de referencia para el agente.
    """
    return """# TrackFlow — Centros Logísticos Oficiales

1. **Almacén Zaragoza (Hub Europa):**
   - Ubicación: Polígono Plaza, Zaragoza, España
   - Capacidad: 15,000 m³
   - Cobertura: España, Portugal, Francia, Alemania
   - Transportistas principales: Correos Express, SEUR, DHL Express

2. **Almacén Los Ángeles (Hub Norteamérica):**
   - Ubicación: Long Beach Logistics District, California, USA
   - Capacidad: 25,000 m³
   - Cobertura: Costa Oeste de EE.UU. y envíos transfronterizos
   - Transportistas principales: UPS Ground, DHL Express Air

*Política general:* Productos marcados como frágiles requieren embalaje reforzado y transportistas con categoría especializada.
"""


# ─────────────────────────────────────────────────────────────
# 5. PROMPTS: Plantillas preconfiguradas para tareas del agente
# ─────────────────────────────────────────────────────────────

@mcp.prompt("inventory-audit-report")
def inventory_audit_report_prompt() -> str:
    """
    Prompt prediseñado para pedir al agente una auditoría de existencias críticas.
    """
    return (
        "Por favor, revisa el inventario de la empresa utilizando la herramienta 'get_inventory_status'. "
        "Identifica qué productos se encuentran en estado 'Low stock' o 'Out of stock'. "
        "Para cada producto crítico, indica su almacén, el stock restante frente al umbral mínimo "
        "y sugiere una acción de reabastecimiento inmediata."
    )


# ─────────────────────────────────────────────────────────────
# 6. Punto de entrada de ejecución
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Inicia el servidor MCP en modo estándar stdio (para agentes y clientes MCP)
    mcp.run()
