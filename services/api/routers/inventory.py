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

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from auth.dependencies import CurrentUser, get_current_user
from inventory import service
from inventory.database import get_db
from inventory.models import AssetCategory, Office
from inventory.schemas import AssetCreate, AssetEntryCreate, AssetExitCreate, AssetOut, OrderOut

router = APIRouter(prefix="/inventory", tags=["inventory"], dependencies=[Depends(get_current_user)])

SessionDep = Annotated[Session, Depends(get_db)]


@router.get("/products", response_model=list[AssetOut])
def list_products(
    session: SessionDep,
    office: Office | None = Query(default=None),
    category: AssetCategory | None = Query(default=None),
) -> list[AssetOut]:
    return service.list_assets(
        session, office=office.value if office else None, category=category.value if category else None
    )


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
) -> list[OrderOut]:
    orders = service.list_orders(session, office=office.value if office else None)
    return [order for order in orders if type is None or order.type == type]
