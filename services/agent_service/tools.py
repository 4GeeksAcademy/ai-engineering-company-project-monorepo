"""External tools for the LangGraph agent — HTTP calls to TrackFlow services.

Each tool:
  - Uses **only** GET requests (read-only, requirement #4).
  - Has an explicit **numeric timeout** of 5 seconds (requirement #6).
  - Authenticates via a **JWT service token** (requirement #3).
  - **Never raises** — returns an ``error`` field instead (requirement #7).

Helpers ``extract_ticket_id`` and ``extract_product_name`` parse
natural-language questions so the graph can decide which tool to call.
"""

from __future__ import annotations

import os
import re
from typing import Optional

import httpx

from services.agent_service.schemas import TicketOutput, ProductOutput


# ── Configuration ──────────────────────────────────────────────────────────

SERVICE_API_BASE = os.getenv("SERVICE_API_BASE", "http://localhost:8000")
INCIDENTS_API_TOKEN = os.getenv("INCIDENTS_API_TOKEN", "")
TOOL_TIMEOUT = httpx.Timeout(5.0)  # requirement #6: timeout explícito numérico


# ── Auth helpers (requirement #3) ──────────────────────────────────────────

def _auth_headers() -> dict[str, str]:
    """Return Authorization header using the service JWT token.

    The token must be set in the environment as INCIDENTS_API_TOKEN.
    If missing, the tool will still attempt the request — the API will
    return 401, which we handle gracefully in the fallback path.
    """
    headers = {"Content-Type": "application/json"}
    if INCIDENTS_API_TOKEN:
        headers["Authorization"] = f"Bearer {INCIDENTS_API_TOKEN}"
    return headers


# ── Extraction helpers ─────────────────────────────────────────────────────

def extract_ticket_id(question: str) -> Optional[int]:
    """Extract a numeric ticket / incident ID from a natural-language question.

    Patterns matched:
      - ``ticket 482``, ``ticket #482``
      - ``incidencia 482``, ``caso 482``
      - ``#482`` at word boundary
      - ``ID 482``, ``id del ticket 482``

    Returns the integer or ``None`` if no ticket ID is found.
    """
    patterns = [
        r"(?:ticket|incidencia|caso|issue)\s*#?(\d+)",
        r"#(\d+)\b",
        r"(?:id|identificador)\s*(?:del\s+)?(?:ticket|caso|incidencia)?\s*#?(\d+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, question, re.IGNORECASE)
        if match:
            return int(match.group(1))
    return None


def extract_product_name(question: str) -> Optional[str]:
    """Extract a product name from a natural-language question.

    Simple heuristic: capture words after known product-related keywords.
    This is intentionally basic — a production system might use NER.

    Returns the extracted name or ``None``.
    """
    patterns = [
        r"(?:stock|inventario|hay\s+de|disponibilidad\s+de)\s+(.+?)(?:\.|,|$|\?)",
        r"(?:producto|proveedor|artículo)\s+(.+?)(?:\.|,|$|\?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, question, re.IGNORECASE)
        if match:
            name = match.group(1).strip().lower()
            if len(name) >= 2:
                return name
    return None


# ── Tool 1: Ticket / Incident lookup (requirement #2) ──────────────────────

def get_ticket_by_id(ticket_id: int) -> TicketOutput:
    """Consultar un ticket/incidencia en el Gestor Centralizado de Incidencias.

    Steps
    -----
    1. Validate ticket_id > 0.
    2. GET ``{SERVICE_API_BASE}/api/incidents/{ticket_id}`` with JWT
       and a 5-second timeout.
    3. On 200 → parse response into ``TicketOutput``.
    4. On timeout / connection error / 404 / 401 → return ``TicketOutput``
       with the ``error`` field set.

    Returns
    -------
    TicketOutput
        Always returns a valid object. Check ``.error`` to detect failures.
    """
    # Step 1: validate
    if not isinstance(ticket_id, int) or ticket_id <= 0:
        return TicketOutput(
            id=0, title="", description="", category="", status="",
            origin="", branch="", created_at="", updated_at="",
            error=f"ID de ticket inválido: {ticket_id}",
        )

    url = f"{SERVICE_API_BASE.rstrip('/')}/api/incidents/{ticket_id}"

    try:
        with httpx.Client(timeout=TOOL_TIMEOUT) as client:
            response = client.get(url, headers=_auth_headers())

        if response.status_code == 200:
            data = response.json()
            return TicketOutput(
                id=data.get("id", ticket_id),
                title=data.get("title", ""),
                description=data.get("description", ""),
                category=data.get("category", ""),
                status=data.get("status", ""),
                origin=data.get("origin", ""),
                branch=data.get("branch", ""),
                created_at=data.get("created_at", ""),
                updated_at=data.get("updated_at", ""),
                error=None,
            )
        elif response.status_code == 404:
            return TicketOutput(
                id=ticket_id, title="", description="", category="",
                status="", origin="", branch="", created_at="", updated_at="",
                error=f"Ticket #{ticket_id} no encontrado en el gestor de incidencias.",
            )
        elif response.status_code == 401:
            return TicketOutput(
                id=ticket_id, title="", description="", category="",
                status="", origin="", branch="", created_at="", updated_at="",
                error="Error de autenticación al consultar el gestor de incidencias.",
            )
        else:
            return TicketOutput(
                id=ticket_id, title="", description="", category="",
                status="", origin="", branch="", created_at="", updated_at="",
                error=f"Error inesperado ({response.status_code}) al consultar ticket #{ticket_id}.",
            )

    except httpx.TimeoutException:
        return TicketOutput(
            id=ticket_id, title="", description="", category="",
            status="", origin="", branch="", created_at="", updated_at="",
            error=f"La consulta del ticket #{ticket_id} excedió el tiempo de espera (5s).",
        )
    except httpx.ConnectError:
        return TicketOutput(
            id=ticket_id, title="", description="", category="",
            status="", origin="", branch="", created_at="", updated_at="",
            error="No se pudo conectar con el gestor de incidencias. "
                  "El servicio podría no estar disponible.",
        )
    except Exception as exc:
        return TicketOutput(
            id=ticket_id, title="", description="", category="",
            status="", origin="", branch="", created_at="", updated_at="",
            error=f"Error inesperado al consultar ticket: {exc}",
        )


# ── Tool 2: Inventory / Supplier lookup (extra, optional) ──────────────────

def get_product_stock(product_name: str) -> ProductOutput:
    """Consultar stock/disponibilidad de un producto en el directorio de
    proveedores.

    Steps
    -----
    1. Validate product_name is non-empty.
    2. GET ``{SERVICE_API_BASE}/suppliers?name={product_name}`` with JWT
       and a 5-second timeout.
    3. On 200 → parse first result into ``ProductOutput``.
    4. On failure → return ``ProductOutput`` with ``error`` set.

    Returns
    -------
    ProductOutput
        Always returns a valid object. Check ``.error`` to detect failures.
    """
    if not product_name or not isinstance(product_name, str) or len(product_name.strip()) < 1:
        return ProductOutput(
            id=0, name="", country="", rate=None, status="",
            error="Nombre de producto inválido.",
        )

    url = f"{SERVICE_API_BASE.rstrip('/')}/suppliers"

    try:
        with httpx.Client(timeout=TOOL_TIMEOUT) as client:
            response = client.get(
                url,
                headers=_auth_headers(),
                params={"name": product_name.strip()},
            )

        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                first = data[0]
                return ProductOutput(
                    id=first.get("id", 0),
                    name=first.get("name", product_name),
                    country=first.get("country", ""),
                    rate=first.get("rate_per_shipment"),
                    status=first.get("status", ""),
                    error=None,
                )
            else:
                return ProductOutput(
                    id=0, name=product_name, country="", rate=None, status="",
                    error=f"No se encontró stock para '{product_name}'.",
                )
        elif response.status_code == 401:
            return ProductOutput(
                id=0, name=product_name, country="", rate=None, status="",
                error="Error de autenticación al consultar el directorio de proveedores.",
            )
        else:
            return ProductOutput(
                id=0, name=product_name, country="", rate=None, status="",
                error=f"Error inesperado ({response.status_code}) al consultar proveedores.",
            )

    except httpx.TimeoutException:
        return ProductOutput(
            id=0, name=product_name, country="", rate=None, status="",
            error="La consulta de stock excedió el tiempo de espera (5s).",
        )
    except httpx.ConnectError:
        return ProductOutput(
            id=0, name=product_name, country="", rate=None, status="",
            error="No se pudo conectar con el directorio de proveedores.",
        )
    except Exception as exc:
        return ProductOutput(
            id=0, name=product_name, country="", rate=None, status="",
            error=f"Error inesperado al consultar stock: {exc}",
        )


__all__ = [
    "extract_ticket_id",
    "extract_product_name",
    "get_ticket_by_id",
    "get_product_stock",
]