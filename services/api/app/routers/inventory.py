"""Inventory router — Product (MenuItem), inbound and outbound orders.

GET    /inventory/products            list products (with computed stock)
POST   /inventory/products            create a product (auth required)
GET    /inventory/products/{id}       get one product (with computed stock)
PATCH  /inventory/products/{id}       update a product's minimum_stock (staff only)
POST   /inventory/orders/inbound      register an inbound order (auth required)
POST   /inventory/orders/outbound     register an outbound order (auth required)
GET    /inventory/orders              list all orders, with product data + user_uuid

Backed by Supabase via SQLModel (app.core.database.get_db), separate
from the TinyDB-backed entities (users, records, incidents, suppliers).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, func
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.deps import require_any_user, require_staff
from app.models.inbound import InboundStock
from app.models.menu_item import MenuItem
from app.models.outbound import StockExit
from app.models.schemas import (
    InboundStockCreate,
    InboundStockResponse,
    MenuItemCreate,
    MenuItemResponse,
    MenuItemUpdate,
    OrderResponse,
    StockExitCreate,
    StockExitResponse,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])

# ingredient_price_variance_detected's approved variance_threshold_pct
# (docs/event-schemas.json) — the literal example value from the briefing.
PRICE_VARIANCE_THRESHOLD_PCT = 10.0
# How many of the most recent same-product+supplier deliveries to average
# for the "historical" cost baseline.
PRICE_HISTORY_WINDOW = 5


def _current_stock(db: Session, ingredient_id: int, country: str, city: str | None) -> float:
    """sum(InboundStock.quantity) - sum(StockExit.quantity) for one ingredient,
    scoped to its restaurant location (country + city — Brasaland's
    partition key / warehouse-equivalent, per context.md's multi-location
    operation). Rows logged under a different location never count here,
    even if they share the same ingredient_id.
    """
    inbound_total = db.exec(
        select(func.sum(InboundStock.quantity)).where(
            InboundStock.ingredient_id == ingredient_id,
            InboundStock.country == country,
            InboundStock.city == city,
        )
    ).one()
    outbound_total = db.exec(
        select(func.sum(StockExit.quantity)).where(
            StockExit.ingredient_id == ingredient_id,
            StockExit.country == country,
            StockExit.city == city,
        )
    ).one()
    return (inbound_total or 0.0) - (outbound_total or 0.0)


def _get_product_or_404(db: Session, product_id: int) -> MenuItem:
    item = db.get(MenuItem, product_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return item


def _to_product_response(db: Session, item: MenuItem) -> MenuItemResponse:
    return MenuItemResponse(
        **item.model_dump(),
        current_stock=_current_stock(db, item.id, item.country, item.city),
    )


def _historical_unit_cost(db: Session, ingredient_id: int, supplier_id: int | None) -> float | None:
    """Average unit_cost of the last PRICE_HISTORY_WINDOW deliveries for the
    same product+supplier (ingredient_price_variance_detected needs this as
    its comparison baseline). Returns None — never a guessed number — when
    there's no supplier_id on the order, or no prior delivery for that
    product+supplier exists yet to compare against.
    """
    if supplier_id is None:
        return None
    rows = db.exec(
        select(InboundStock.unit_cost)
        .where(
            InboundStock.ingredient_id == ingredient_id,
            InboundStock.supplier_id == supplier_id,
            InboundStock.unit_cost.is_not(None),
        )
        .order_by(desc(InboundStock.created_at))
        .limit(PRICE_HISTORY_WINDOW)
    ).all()
    if not rows:
        return None
    return sum(rows) / len(rows)


# ── POST /inventory/products ───────────────────────────────
@router.post("/products", response_model=MenuItemResponse, status_code=201)
async def create_product(
    payload: MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_staff),
):
    """Create a product (staff only — manager or admin)."""
    if db.exec(select(MenuItem).where(MenuItem.sku == payload.sku)).first():
        raise HTTPException(status_code=409, detail=f"SKU '{payload.sku}' already exists.")

    item = MenuItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_product_response(db, item)


# ── GET /inventory/products ────────────────────────────────
@router.get("/products", response_model=list[MenuItemResponse])
async def list_products(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_user),
):
    """List all products, each with its computed current_stock."""
    items = db.exec(select(MenuItem)).all()
    return [_to_product_response(db, item) for item in items]


# ── GET /inventory/products/{id} ───────────────────────────
@router.get("/products/{product_id}", response_model=MenuItemResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_user),
):
    """Get one product by ID, with its computed current_stock."""
    item = _get_product_or_404(db, product_id)
    return _to_product_response(db, item)


# ── PATCH /inventory/products/{id} ─────────────────────────
@router.patch("/products/{product_id}", response_model=MenuItemResponse)
async def update_product(
    product_id: int,
    payload: MenuItemUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_staff),
):
    """Adjust a product's minimum_stock threshold (staff only). The only
    editable field today — the minimal capability stock_threshold_triggered's
    own decision requires ("ajustar el umbral mínimo")."""
    item = _get_product_or_404(db, product_id)
    item.minimum_stock = payload.minimum_stock
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_product_response(db, item)


# ── POST /inventory/orders/inbound ─────────────────────────
@router.post("/orders/inbound", response_model=InboundStockResponse, status_code=201)
async def create_inbound_order(
    payload: InboundStockCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_user),
):
    """Register an inbound order (ingredient delivery) for a product."""
    product = _get_product_or_404(db, payload.ingredient_id)
    if (payload.country, payload.city) != (product.country, product.city):
        raise HTTPException(
            status_code=422,
            detail="Order location must match the product's location (country/city).",
        )

    # Computed BEFORE inserting this row, so the new delivery's own cost
    # never counts toward its own "historical" baseline.
    historical_cost = _historical_unit_cost(db, payload.ingredient_id, payload.supplier_id)

    entry = InboundStock(**payload.model_dump(), user_uuid=current_user["id"])
    db.add(entry)
    db.commit()
    db.refresh(entry)

    variance_pct = None
    price_variance_detected = False
    if historical_cost is not None:
        variance_pct = (entry.unit_cost - historical_cost) / historical_cost * 100
        price_variance_detected = abs(variance_pct) >= PRICE_VARIANCE_THRESHOLD_PCT

    return InboundStockResponse(
        **entry.model_dump(),
        unit_cost_historical=historical_cost,
        variance_pct=variance_pct,
        price_variance_detected=price_variance_detected,
    )


# ── POST /inventory/orders/outbound ────────────────────────
@router.post("/orders/outbound", response_model=StockExitResponse, status_code=201)
async def create_outbound_order(
    payload: StockExitCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_user),
):
    """Register an outbound order (ingredient withdrawal) for a product."""
    product = _get_product_or_404(db, payload.ingredient_id)
    if (payload.country, payload.city) != (product.country, product.city):
        raise HTTPException(
            status_code=422,
            detail="Order location must match the product's location (country/city).",
        )

    available = _current_stock(db, payload.ingredient_id, product.country, product.city)
    if payload.quantity > available:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot withdraw {payload.quantity} {payload.unit} of product "
                f"{payload.ingredient_id} ({product.name}) in {product.city or product.country}: "
                f"only {available} {payload.unit} available. This order was not recorded."
            ),
        )

    entry = StockExit(**payload.model_dump(), user_uuid=current_user["id"])
    db.add(entry)
    db.commit()
    db.refresh(entry)

    current_stock_after = available - payload.quantity
    threshold_crossed = available >= product.minimum_stock > current_stock_after

    return StockExitResponse(
        **entry.model_dump(),
        minimum_stock=product.minimum_stock,
        current_stock_after=current_stock_after,
        threshold_crossed=threshold_crossed,
    )


# ── GET /inventory/orders ──────────────────────────────────
@router.get("/orders", response_model=list[OrderResponse])
async def list_orders(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_user),
):
    """List all orders (inbound + outbound), each with its product data and user_uuid."""
    inbound_rows = db.exec(
        select(InboundStock, MenuItem).join(MenuItem, InboundStock.ingredient_id == MenuItem.id)
    ).all()
    outbound_rows = db.exec(
        select(StockExit, MenuItem).join(MenuItem, StockExit.ingredient_id == MenuItem.id)
    ).all()

    orders = [
        OrderResponse(
            id=entry.id,
            order_type="inbound",
            ingredient_id=entry.ingredient_id,
            product_name=product.name,
            product_sku=product.sku,
            quantity=entry.quantity,
            unit=entry.unit,
            user_uuid=entry.user_uuid,
            country=entry.country,
            city=entry.city,
            created_at=entry.created_at,
            supplier_id=entry.supplier_id,
        )
        for entry, product in inbound_rows
    ] + [
        OrderResponse(
            id=entry.id,
            order_type="outbound",
            ingredient_id=entry.ingredient_id,
            product_name=product.name,
            product_sku=product.sku,
            quantity=entry.quantity,
            unit=entry.unit,
            user_uuid=entry.user_uuid,
            country=entry.country,
            city=entry.city,
            created_at=entry.created_at,
            reason=entry.reason,
        )
        for entry, product in outbound_rows
    ]

    orders.sort(key=lambda o: o.created_at, reverse=True)
    return orders
