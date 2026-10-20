"""Routes of the inventory domain, all under ``/inventory`` (``routers/inventory.py``, as the
Hito 5 CONTEXT places it). The models, schemas, queries and connections it uses live in the
``inventory`` package.

Every route needs a valid session (``get_current_user``, from the TinyDB users). Orders are
stamped with that user's id. There is deliberately no PUT/PATCH/DELETE on assets or orders:
stock cannot be edited, only moved by registering an order.

The handlers are plain ``def`` (not ``async def``): the SQL driver blocks, so FastAPI runs
them in its thread pool instead of stalling the event loop.
"""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import TypeAdapter
from sqlmodel import Session

from auth.dependencies import CurrentUser, get_current_user
from core.cache import TTLCache, cached_json
from inventory import service
from inventory.database import get_db
from inventory.models import AssetCategory, Office
from inventory.schemas import AssetCreate, AssetEntryCreate, AssetExitCreate, AssetOut, OrderOut

router = APIRouter(prefix="/inventory", tags=["inventory"], dependencies=[Depends(get_current_user)])

SessionDep = Annotated[Session, Depends(get_db)]

# Cached reads (same answer for every authenticated user). Dropped by every committed write (inventory/service.py);
# the TTL is the staleness bound for writes made by another worker or process. Short on purpose: stock is what people
# decide on. ``GET /products/{id}`` is NOT cached: the order forms read it right before and after registering an order.
#   products 30 s : ~48 ms with 800 assets (correlated SUMs over every order). The key is office x category.
#   orders   30 s : ~0.9 s and ~10 MB with 30 000 orders. maxsize 4 keeps at most ~40 MB of serialised bodies.
PRODUCTS_CACHE = TTLCache("inventory.products", group=service.CACHE_GROUP, ttl=30, maxsize=32)
ORDERS_CACHE = TTLCache("inventory.orders", group=service.CACHE_GROUP, ttl=30, maxsize=4)
_ASSETS = TypeAdapter(list[AssetOut])
_ORDERS = TypeAdapter(list[OrderOut])


@router.get("/products", response_model=list[AssetOut])
def list_products(
    session: SessionDep,
    office: Office | None = Query(default=None),
    category: AssetCategory | None = Query(default=None),
) -> Response:
    office_value, category_value = (office.value if office else None), (category.value if category else None)
    build = lambda: service.list_assets(session, office=office_value, category=category_value)  # noqa: E731
    return cached_json(PRODUCTS_CACHE, (office_value, category_value), build, _ASSETS)


@router.post("/products", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: AssetCreate, session: SessionDep) -> AssetOut:
    try:
        return service.create_asset(session, payload)
    except service.DuplicateSkuError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/products/{asset_id}", response_model=AssetOut)
def get_product(asset_id: int, session: SessionDep) -> AssetOut:
    try:
        return service.get_asset(session, asset_id)
    except service.AssetNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/orders/inbound", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def register_inbound(payload: AssetEntryCreate, session: SessionDep, current: CurrentUser) -> OrderOut:
    try:
        return service.register_inbound(session, payload, str(current.id))
    except service.AssetNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except service.OfficeMismatchError as exc:
        raise HTTPException(422, detail=str(exc)) from exc


@router.post("/orders/outbound", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def register_outbound(payload: AssetExitCreate, session: SessionDep, current: CurrentUser) -> OrderOut:
    try:
        return service.register_outbound(session, payload, str(current.id))
    except service.AssetNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except service.OfficeMismatchError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except service.InsufficientStockError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/orders", response_model=list[OrderOut])
def list_orders(
    session: SessionDep,
    office: Office | None = Query(default=None),
    type: Literal["inbound", "outbound"] | None = Query(default=None),
) -> Response:
    office_value = office.value if office else None

    def build() -> list[OrderOut]:
        orders = service.list_orders(session, office=office_value)
        return [order for order in orders if type is None or order.type == type]

    return cached_json(ORDERS_CACHE, (office_value, type), build, _ORDERS)
