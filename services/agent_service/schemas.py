"""Schemas for LangGraph agent external tools — typed contracts.

Each tool function uses these Pydantic models for input validation
and output serialisation, ensuring the agent graph receives and
produces consistent, documented data structures.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# ── Ticket / Incident Tool ─────────────────────────────────────────────────

class TicketInput(BaseModel):
    """Input contract for the ticket (incident) lookup tool.

    The agent extracts a ticket_id from the user's natural-language
    question and passes it to get_ticket_by_id().
    """

    ticket_id: int = Field(..., gt=0, description="ID numérico del ticket/incidencia")
    search_term: Optional[str] = Field(
        None, max_length=200,
        description="Término adicional para filtrar (reservado para futuro uso)",
    )


class TicketOutput(BaseModel):
    """Output contract for the ticket (incident) lookup tool.

    Mirrors the IncidentResponse model from the API, but adds an
    optional ``error`` field so the agent can distinguish between
    a successful lookup and a service-level failure.
    """

    id: int
    title: str
    description: str
    category: str
    status: str
    origin: str
    branch: str
    created_at: str
    updated_at: str
    error: Optional[str] = Field(
        None,
        description="Si es distinto de None, la consulta falló y el resto "
                    "de campos pueden estar vacíos o ser placeholders",
    )


# ── Inventory / Supplier Tool ──────────────────────────────────────────────

class ProductInput(BaseModel):
    """Input contract for the product / supplier lookup tool."""

    product_name: str = Field(..., min_length=1, max_length=200)
    # Future: product_id: int = Field(None, gt=0)


class ProductOutput(BaseModel):
    """Output contract for the product / supplier lookup tool."""

    id: int
    name: str
    country: str
    rate: Optional[float] = None
    status: str
    error: Optional[str] = Field(
        None,
        description="Si es distinto de None, la consulta falló.",
    )


__all__ = [
    "TicketInput",
    "TicketOutput",
    "ProductInput",
    "ProductOutput",
]