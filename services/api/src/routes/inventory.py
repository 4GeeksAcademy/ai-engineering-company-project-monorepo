"""Inventory management router — SKU products, inbound and outbound orders."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, func, select

from src.database import get_sql_session
from src.models.models import SKU, SKUEntry, SKUExit
from src.models.schemas import (
    SKUCreate,
    SKUEntryRead,
    SKUExitRead,
    SKURead,
)
from src.models.user import User
from src.services.auth_service import get_current_user

inventory_router = APIRouter(prefix="/inventory", tags=["inventory"])


# ── Internal helpers ─────────────────────────────────────────────────────


def _compute_current_stock(session: Session, sku_id: str) -> int:
    """Return total_entries - total_exits for a given SKU."""
    total_entries: int | None = session.exec(
        select(func.sum(SKUEntry.quantity)).where(SKUEntry.sku_id == sku_id)
    ).one()
    total_exits: int | None = session.exec(
        select(func.sum(SKUExit.quantity)).where(SKUExit.sku_id == sku_id)
    ).one()
    return (total_entries or 0) - (total_exits or 0)


def _build_sku_read(session: Session, sku: SKU) -> SKURead:
    """Build a SKURead response with the computed current_stock."""
    return SKURead(
        id=sku.id,
        name=sku.name,
        sku_code=sku.sku_code,
        warehouse=sku.warehouse,
        current_stock=_compute_current_stock(session, sku.id),
    )


# ── Inline request bodies (user_uuid is injected server-side) ────────────


class _InboundRequest(BaseModel):
    """Request body for creating an inbound order.

    ``user_uuid`` is not accepted from the client — it is injected
    from the authenticated user's token.
    """

    sku_id: str = Field(min_length=1)
    quantity: int = Field(ge=1)


class _OutboundRequest(BaseModel):
    """Request body for creating an outbound order.

    ``user_uuid`` is not accepted from the client — it is injected
    from the authenticated user's token.
    """

    sku_id: str = Field(min_length=1)
    quantity: int = Field(ge=1)


# ── GET /inventory/products ──────────────────────────────────────────


@inventory_router.get("/products", response_model=list[SKURead])
def list_products(
    db: Session = Depends(get_sql_session),
) -> list[SKURead]:
    """List all SKUs with their dynamically computed ``current_stock``."""
    skus = db.exec(select(SKU)).all()
    return [_build_sku_read(db, sku) for sku in skus]


# ── POST /inventory/products ────────────────────────────────────────


@inventory_router.post(
    "/products",
    response_model=SKURead,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    payload: SKUCreate,
    db: Session = Depends(get_sql_session),
    _current_user: User = Depends(get_current_user),
) -> SKURead:
    """Create a new SKU product (initial stock is implicitly zero)."""
    sku = SKU(
        name=payload.name,
        sku_code=payload.sku_code,
        warehouse=payload.warehouse,
    )
    db.add(sku)
    db.commit()
    db.refresh(sku)
    return _build_sku_read(db, sku)


# ── GET /inventory/products/{sku_id} ──────────────────────────────────


@inventory_router.get("/products/{sku_id}", response_model=SKURead)
def get_product(
    sku_id: str,
    db: Session = Depends(get_sql_session),
) -> SKURead:
    """Get a specific SKU with its computed ``current_stock``."""
    sku = db.get(SKU, sku_id)
    if sku is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SKU no encontrado.",
        )
    return _build_sku_read(db, sku)


# ── POST /inventory/orders/inbound ──────────────────────────────────


@inventory_router.post(
    "/orders/inbound",
    response_model=SKUEntryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_inbound_order(
    payload: _InboundRequest,
    db: Session = Depends(get_sql_session),
    _current_user: User = Depends(get_current_user),
) -> SKUEntry:
    """Record an inbound stock movement (SKUEntry).

    The ``user_uuid`` is **not** taken from the request body; it is
    injected from the authenticated user's token.
    """
    # Verify the SKU exists
    sku = db.get(SKU, payload.sku_id)
    if sku is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SKU con id '{payload.sku_id}' no encontrado.",
        )

    entry = SKUEntry(
        sku_id=payload.sku_id,
        quantity=payload.quantity,
        user_uuid=str(_current_user.id),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# ── POST /inventory/orders/outbound ─────────────────────────────────


@inventory_router.post(
    "/orders/outbound",
    response_model=SKUExitRead,
    status_code=status.HTTP_201_CREATED,
)
def create_outbound_order(
    payload: _OutboundRequest,
    db: Session = Depends(get_sql_session),
    _current_user: User = Depends(get_current_user),
) -> SKUExit:
    """Record an outbound stock movement (SKUExit).

    **Business rule:** stock must not go negative.  If the resulting
    stock would be < 0 the transaction is rejected with HTTP 400.
    The ``user_uuid`` is injected from the authenticated user's token.
    """
    # Verify the SKU exists
    sku = db.get(SKU, payload.sku_id)
    if sku is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SKU con id '{payload.sku_id}' no encontrado.",
        )

    # Compute current stock before persisting the exit
    current_stock = _compute_current_stock(db, payload.sku_id)

    if current_stock - payload.quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Stock insuficiente para el SKU '{payload.sku_id}'. "
                f"Stock actual: {current_stock}, "
                f"salida solicitada: {payload.quantity}."
            ),
        )

    exit_order = SKUExit(
        sku_id=payload.sku_id,
        quantity=payload.quantity,
        user_uuid=str(_current_user.id),
    )
    db.add(exit_order)
    db.commit()
    db.refresh(exit_order)
    return exit_order


# ── GET /inventory/orders ───────────────────────────────────────────


@inventory_router.get("/orders")
def list_orders(
    db: Session = Depends(get_sql_session),
) -> list[dict[str, object]]:
    """List a combined history of inbound and outbound orders with SKU data.

    Results are sorted by ``created_at`` descending (most recent first).
    """
    entries = db.exec(
        select(SKUEntry, SKU).join(SKU, SKUEntry.sku_id == SKU.id)  # type: ignore[arg-type]
    ).all()

    exits = db.exec(
        select(SKUExit, SKU).join(SKU, SKUExit.sku_id == SKU.id)  # type: ignore[arg-type]
    ).all()

    results: list[dict[str, object]] = []

    for entry, sku in entries:
        results.append(
            {
                "order_type": "inbound",
                "id": entry.id,
                "sku_id": entry.sku_id,
                "sku_code": sku.sku_code,
                "sku_name": sku.name,
                "warehouse": sku.warehouse,
                "quantity": entry.quantity,
                "user_uuid": entry.user_uuid,
                "created_at": entry.created_at.isoformat(),
            }
        )

    for exit_order, sku in exits:
        results.append(
            {
                "order_type": "outbound",
                "id": exit_order.id,
                "sku_id": exit_order.sku_id,
                "sku_code": sku.sku_code,
                "sku_name": sku.name,
                "warehouse": sku.warehouse,
                "quantity": exit_order.quantity,
                "user_uuid": exit_order.user_uuid,
                "created_at": exit_order.created_at.isoformat(),
            }
        )

    results.sort(key=lambda r: str(r["created_at"]), reverse=True)
    return results