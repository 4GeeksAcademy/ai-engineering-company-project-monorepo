"""Inventory logic on the SQLModel session: derived stock and the order rules.

Stock is never stored: `current_stock = SUM(entries) - SUM(exits)` per asset.
Lists use grouped aggregates joined to the assets (one query, no per-row SELECT),
and order lists JOIN the asset instead of loading it row by row.
"""

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, func, select

from inventory_models import Asset, AssetEntry, AssetExit
from inventory_schemas import (
    AssetCreate,
    AssetEntryCreate,
    AssetEntryResponse,
    AssetExitCreate,
    AssetExitResponse,
    AssetResponse,
    Office,
    OrderResponse,
)


class AssetNotFound(Exception):
    def __init__(self, asset_id: int) -> None:
        super().__init__(f"Asset {asset_id} not found")
        self.asset_id = asset_id


class SkuAlreadyExists(Exception):
    def __init__(self, sku: str) -> None:
        super().__init__(f"An asset with sku '{sku}' already exists")
        self.sku = sku


class InsufficientStock(Exception):
    def __init__(self, name: str, available: int, requested: int) -> None:
        super().__init__(f"Insufficient stock for asset '{name}'. Available: {available}, requested: {requested}.")


def _totals(model: type[AssetEntry] | type[AssetExit]):
    return select(model.asset_id, func.sum(model.quantity).label("total")).group_by(model.asset_id).subquery()


def _assets_with_stock():
    """SELECT asset, stock: both sums grouped by asset_id and LEFT JOINed, so an asset without orders has 0."""
    entries, exits = _totals(AssetEntry), _totals(AssetExit)
    stock = func.coalesce(entries.c.total, 0) - func.coalesce(exits.c.total, 0)
    return (
        select(Asset, stock)
        .join(entries, entries.c.asset_id == Asset.id, isouter=True)
        .join(exits, exits.c.asset_id == Asset.id, isouter=True)
    )


def _response(asset: Asset, stock: int) -> AssetResponse:
    return AssetResponse.model_validate({**asset.model_dump(), "current_stock": int(stock)})


def list_assets(session: Session, office: Office | None = None) -> list[AssetResponse]:
    query = _assets_with_stock().order_by(Asset.id)
    if office is not None:
        query = query.where(Asset.office == office.value)
    return [_response(asset, stock) for asset, stock in session.exec(query)]


def get_asset(session: Session, asset_id: int) -> AssetResponse:
    row = session.exec(_assets_with_stock().where(Asset.id == asset_id)).first()
    if row is None:
        raise AssetNotFound(asset_id)
    return _response(*row)


def create_asset(session: Session, data: AssetCreate) -> AssetResponse:
    if session.exec(select(Asset.id).where(Asset.sku == data.sku)).first() is not None:
        raise SkuAlreadyExists(data.sku)
    asset = Asset(**data.model_dump(mode="json"))
    session.add(asset)
    try:
        session.commit()
    except IntegrityError as error:  # two requests with the same sku raced past the check
        session.rollback()
        raise SkuAlreadyExists(data.sku) from error
    session.refresh(asset)
    return _response(asset, 0)


def _lock_asset(session: Session, asset_id: int) -> Asset:
    """Load the asset with SELECT ... FOR UPDATE: concurrent orders on it wait until this transaction ends."""
    asset = session.exec(select(Asset).where(Asset.id == asset_id).with_for_update()).first()
    if asset is None:
        raise AssetNotFound(asset_id)
    return asset


def _available(session: Session, asset_id: int) -> int:
    entered = session.exec(select(func.coalesce(func.sum(AssetEntry.quantity), 0)).where(AssetEntry.asset_id == asset_id)).one()
    exited = session.exec(select(func.coalesce(func.sum(AssetExit.quantity), 0)).where(AssetExit.asset_id == asset_id)).one()
    return int(entered) - int(exited)


def create_entry(session: Session, data: AssetEntryCreate, user_uuid: str) -> AssetEntryResponse:
    asset = _lock_asset(session, data.asset_id)
    entry = AssetEntry(**data.model_dump(mode="json"), user_uuid=user_uuid)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return _entry_response(entry, asset)


def create_exit(session: Session, data: AssetExitCreate, user_uuid: str) -> AssetExitResponse:
    """Register an exit if the stock covers it. The check and the insert share one transaction and the asset row lock."""
    asset = _lock_asset(session, data.asset_id)
    available = _available(session, asset.id)
    if data.quantity > available:
        session.rollback()  # nothing was written; this also releases the lock
        raise InsufficientStock(asset.name, available, data.quantity)
    exit_ = AssetExit(**data.model_dump(mode="json"), user_uuid=user_uuid)
    session.add(exit_)
    session.commit()
    session.refresh(exit_)
    return _exit_response(exit_, asset)


def _entry_response(entry: AssetEntry, asset: Asset) -> AssetEntryResponse:
    return AssetEntryResponse.model_validate({**entry.model_dump(), "asset_name": asset.name, "asset_sku": asset.sku})


def _exit_response(exit_: AssetExit, asset: Asset) -> AssetExitResponse:
    return AssetExitResponse.model_validate({**exit_.model_dump(), "asset_name": asset.name, "asset_sku": asset.sku})


def list_orders(session: Session, office: Office | None = None) -> list[OrderResponse]:
    """Every entry and exit, newest first, with its asset: two JOIN queries in total."""
    entries = select(AssetEntry, Asset).join(Asset, AssetEntry.asset_id == Asset.id)
    exits = select(AssetExit, Asset).join(Asset, AssetExit.asset_id == Asset.id)
    if office is not None:
        entries = entries.where(AssetEntry.office == office.value)
        exits = exits.where(AssetExit.office == office.value)
    orders: list[OrderResponse] = [_entry_response(entry, asset) for entry, asset in session.exec(entries)]
    orders += [_exit_response(exit_, asset) for exit_, asset in session.exec(exits)]
    return sorted(orders, key=lambda order: (order.created_at, order.order_type, order.id), reverse=True)
