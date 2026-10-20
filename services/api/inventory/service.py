"""Business logic of the inventory domain.

Rules enforced here (the CONTEXT's "Reglas de Negocio"):

1. ``current_stock = SUM(entries) - SUM(exits)``, computed on every read, never stored.
2. An outbound order that would exceed the stock is refused *before* anything is written.
5. Both offices share the same tables; ``office`` is a filter, not a partition.

Every read that needs related data fetches it in the same statement (a correlated aggregate
for the stock, a JOIN for the asset of an order), so the number of queries does not grow with
the number of rows: no N+1.
"""

from __future__ import annotations

from sqlmodel import Session, col, func, select

from core.cache import invalidate

from .models import Asset, AssetEntry, AssetExit
from .schemas import (
    AssetBrief,
    AssetCreate,
    AssetEntryCreate,
    AssetExitCreate,
    AssetOut,
    OrderOut,
)

# Group of the cached reads of routers/inventory.py. A committed write (new asset, inbound or outbound order) drops
# them, because it changes what the product and order lists show. The write path itself never reads from the cache:
# the stock check of an outbound order is always made against the database, under the row lock.
CACHE_GROUP = "inventory"

# Correlated scalar subqueries: one SELECT returns every asset with its net stock. The sums
# are bounded by the partition key of the CONTEXT, ``office``: an asset's stock only counts
# the orders of its own office (the API refuses any other, see ``_check_office``).
_ENTERED = (
    select(func.coalesce(func.sum(AssetEntry.quantity), 0))
    .where(AssetEntry.asset_id == Asset.id, AssetEntry.office == Asset.office)
    .scalar_subquery()
)
_EXITED = (
    select(func.coalesce(func.sum(AssetExit.quantity), 0))
    .where(AssetExit.asset_id == Asset.id, AssetExit.office == Asset.office)
    .scalar_subquery()
)
_STOCK = (_ENTERED - _EXITED).label("current_stock")


class AssetNotFoundError(Exception):
    def __init__(self, asset_id: int):
        super().__init__(f"Asset {asset_id} not found")


class DuplicateSkuError(Exception):
    def __init__(self, sku: str):
        super().__init__(f"An asset with SKU '{sku}' already exists")


class OfficeMismatchError(Exception):
    def __init__(self, name: str, asset_office: str, order_office: str):
        super().__init__(
            f"Asset '{name}' belongs to the {asset_office} office: an order for it cannot be registered in {order_office}."
        )


class InsufficientStockError(Exception):
    def __init__(self, name: str, available: int, quantity: int):
        super().__init__(f"Insufficient stock for asset '{name}'. Available: {available}, requested: {quantity}.")


def _asset_out(asset: Asset, stock: int) -> AssetOut:
    return AssetOut(
        id=asset.id, name=asset.name, sku=asset.sku, category=asset.category, office=asset.office, current_stock=stock
    )


def list_assets(session: Session, *, office: str | None = None, category: str | None = None) -> list[AssetOut]:
    statement = select(Asset, _STOCK).order_by(col(Asset.id))
    if office:
        statement = statement.where(Asset.office == office)
    if category:
        statement = statement.where(Asset.category == category)
    return [_asset_out(asset, int(stock)) for asset, stock in session.exec(statement)]


def get_asset(session: Session, asset_id: int) -> AssetOut:
    row = session.exec(select(Asset, _STOCK).where(Asset.id == asset_id)).first()
    if row is None:
        raise AssetNotFoundError(asset_id)
    return _asset_out(row[0], int(row[1]))


def _sku_exists(session: Session, sku: str) -> bool:
    return session.exec(select(Asset.id).where(Asset.sku == sku)).first() is not None


def create_asset(session: Session, payload: AssetCreate) -> AssetOut:
    """A new asset starts at 0 units: stock only arrives through an inbound order."""
    if _sku_exists(session, payload.sku):
        raise DuplicateSkuError(payload.sku)
    asset = Asset(name=payload.name, sku=payload.sku, category=payload.category.value, office=payload.office.value)
    session.add(asset)
    try:
        session.commit()
    except Exception as exc:
        # The UNIQUE constraint on sku is the source of truth: if another request took the
        # SKU between the check above and this insert, it is the same conflict.
        session.rollback()
        if _sku_exists(session, payload.sku):
            raise DuplicateSkuError(payload.sku) from exc
        raise
    session.refresh(asset)
    invalidate(CACHE_GROUP)
    return _asset_out(asset, 0)


def _brief(asset: Asset) -> AssetBrief:
    return AssetBrief(id=asset.id, name=asset.name, sku=asset.sku, category=asset.category, office=asset.office)


def _inbound_out(entry: AssetEntry, asset: Asset) -> OrderOut:
    return OrderOut(
        type="inbound",
        id=entry.id,
        asset=_brief(asset),
        quantity=entry.quantity,
        office=entry.office,
        created_at=entry.created_at,
        user_uuid=entry.user_uuid,
        supplier=entry.supplier,
    )


def _outbound_out(exit_: AssetExit, asset: Asset) -> OrderOut:
    return OrderOut(
        type="outbound",
        id=exit_.id,
        asset=_brief(asset),
        quantity=exit_.quantity,
        office=exit_.office,
        created_at=exit_.created_at,
        user_uuid=exit_.user_uuid,
        exit_type=exit_.exit_type,
        assigned_to=exit_.assigned_to,
    )


def _check_office(asset: Asset, order_office: str) -> None:
    """Both offices share the tables, but each asset lives in one: an order must come from it,
    otherwise it would be stored and never counted in the stock."""
    if asset.office != order_office:
        raise OfficeMismatchError(asset.name, asset.office, order_office)


def register_inbound(session: Session, payload: AssetEntryCreate, user_uuid: str) -> OrderOut:
    asset = session.get(Asset, payload.asset_id)
    if asset is None:
        raise AssetNotFoundError(payload.asset_id)
    _check_office(asset, payload.office.value)
    entry = AssetEntry(
        asset_id=asset.id,
        quantity=payload.quantity,
        supplier=payload.supplier,
        office=payload.office.value,
        user_uuid=user_uuid,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    invalidate(CACHE_GROUP)
    return _inbound_out(entry, asset)


def register_outbound(session: Session, payload: AssetExitCreate, user_uuid: str) -> OrderOut:
    # FOR UPDATE locks the asset row on PostgreSQL until the commit, so two simultaneous
    # outbound orders cannot both pass the stock check and drive the stock negative.
    # (SQLite, the local fallback, ignores the clause and is single-writer anyway.)
    row = session.exec(select(Asset, _STOCK).where(Asset.id == payload.asset_id).with_for_update(of=Asset)).first()
    if row is None:
        raise AssetNotFoundError(payload.asset_id)
    asset, available = row[0], int(row[1])
    try:
        _check_office(asset, payload.office.value)
    except OfficeMismatchError:
        session.rollback()  # release the lock; nothing was written
        raise
    if payload.quantity > available:
        session.rollback()  # release the lock; nothing was written
        raise InsufficientStockError(asset.name, available, payload.quantity)
    exit_ = AssetExit(
        asset_id=asset.id,
        quantity=payload.quantity,
        exit_type=payload.exit_type.value,
        assigned_to=payload.assigned_to,
        office=payload.office.value,
        user_uuid=user_uuid,
    )
    session.add(exit_)
    session.commit()
    session.refresh(exit_)
    invalidate(CACHE_GROUP)
    return _outbound_out(exit_, asset)


def list_orders(session: Session, *, office: str | None = None) -> list[OrderOut]:
    """Every inbound and outbound order, newest first, with its asset. Two statements
    (one per table), each JOINed to ``assets``, however many orders there are."""
    entries = select(AssetEntry, Asset).join(Asset, col(AssetEntry.asset_id) == col(Asset.id))
    exits = select(AssetExit, Asset).join(Asset, col(AssetExit.asset_id) == col(Asset.id))
    if office:
        entries = entries.where(AssetEntry.office == office)
        exits = exits.where(AssetExit.office == office)
    orders = [_inbound_out(entry, asset) for entry, asset in session.exec(entries)]
    orders += [_outbound_out(exit_, asset) for exit_, asset in session.exec(exits)]
    orders.sort(key=lambda order: (order.created_at, order.type, order.id), reverse=True)
    return orders
