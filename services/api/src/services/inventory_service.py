"""Inventory service layer — stock query, reservation, and threshold alerts.

Based on the TrackFlow logistics domain from ticket API-042.
Backed by TinyDB tables: products, stock_movements, stock_reservations.
"""

from __future__ import annotations

from datetime import datetime, timezone

from tinydb import Query
from tinydb.table import Document

from src.database import get_products_table, get_stock_movements_table, get_stock_reservations_table
from src.models.inventory import (
    Product,
    ProductCreate,
    StockMovement,
    StockMovementType,
    StockReservation,
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_product(document: Document) -> Product:
    payload = dict(document)
    return Product.model_validate(payload)


def _to_stock_movement(document: Document) -> StockMovement:
    payload = dict(document)
    return StockMovement.model_validate(payload)


# ──────────────────────────────────────────────
# Product CRUD
# ──────────────────────────────────────────────


def create_product(payload: ProductCreate) -> Product:
    """Register a new product (inventory item)."""
    products_table = get_products_table()
    product = Product(**payload.model_dump())

    doc_id = products_table.insert(product.model_dump(mode="json"))
    document = products_table.get(doc_id=doc_id)
    if document is None:
        raise RuntimeError("No se pudo crear el producto")
    return _to_product(document)


def get_product_by_id(product_id: str) -> Product | None:
    """Look up a product by its UUID."""
    products_table = get_products_table()
    query = Query()
    document = products_table.get(query.id == product_id)
    if document is None:
        return None
    return _to_product(document)


def get_product_by_sku(sku: str) -> Product | None:
    """Look up a product by its SKU code."""
    products_table = get_products_table()
    query = Query()
    document = products_table.get(query.sku == sku)
    if document is None:
        return None
    return _to_product(document)


def list_products(
    *,
    categoria: str | None = None,
    ubicacion: str | None = None,
    stock_bajo: bool = False,
) -> list[Product]:
    """List products with optional filters.

    - categoria: filter by product category (exact name match).
    - ubicacion: filter by warehouse location.
    - stock_bajo: only return products where cantidad <= stock_minimo.
    """
    products_table = get_products_table()
    documents = products_table.all()

    if categoria is not None:
        documents = [
            d for d in documents if d.get("categoria") == categoria
        ]
    if ubicacion is not None:
        documents = [
            d for d in documents if d.get("ubicacion") == ubicacion
        ]
    if stock_bajo:
        documents = [
            d for d in documents if d.get("cantidad", 0) <= d.get("stock_minimo", 0)
        ]

    return [_to_product(d) for d in documents]


def update_product_stock(product_id: str, cantidad: int) -> Product | None:
    """Set the absolute stock quantity for a product."""
    if cantidad < 0:
        raise ValueError("La cantidad no puede ser negativa")

    products_table = get_products_table()
    query = Query()
    document = products_table.get(query.id == product_id)
    if document is None:
        return None

    products_table.update(
        {"cantidad": cantidad, "updated_at": _now_utc().isoformat()},
        doc_ids=[document.doc_id],
    )
    updated = products_table.get(doc_id=document.doc_id)
    if updated is None:
        return None
    return _to_product(updated)


# ──────────────────────────────────────────────
# Stock operations
# ──────────────────────────────────────────────


def add_stock(product_id: str, cantidad: int, motivo: str = "") -> Product | None:
    """Add inbound stock to a product.

    cantidad must be > 0. Returns None if product does not exist.
    """
    if cantidad <= 0:
        raise ValueError("La cantidad debe ser mayor que 0")

    product = get_product_by_id(product_id)
    if product is None:
        return None

    new_cantidad = product.cantidad + cantidad
    updated = update_product_stock(product_id, new_cantidad)
    if updated is None:
        return None

    _record_movement(
        product_id=product.id,
        sku=product.sku,
        tipo=StockMovementType.INBOUND,
        cantidad=cantidad,
        motivo=motivo,
    )
    return updated


def remove_stock(product_id: str, cantidad: int, motivo: str = "") -> Product | None:
    """Remove outbound stock from a product.

    cantidad must be > 0.
    Raises ValueError if there is insufficient stock.
    Returns None if product does not exist.
    """
    if cantidad <= 0:
        raise ValueError("La cantidad debe ser mayor que 0")

    product = get_product_by_id(product_id)
    if product is None:
        return None

    if product.cantidad < cantidad:
        raise ValueError(
            f"Stock insuficiente: disponible {product.cantidad}, solicitado {cantidad}"
        )

    new_cantidad = product.cantidad - cantidad
    updated = update_product_stock(product_id, new_cantidad)
    if updated is None:
        return None

    _record_movement(
        product_id=product.id,
        sku=product.sku,
        tipo=StockMovementType.OUTBOUND,
        cantidad=cantidad,
        motivo=motivo,
    )
    return updated


def reserve_stock(product_id: str, cantidad: int) -> tuple[StockReservation | None, Product | None]:
    """Reserve stock for a pending order without removing it.

    Returns (reservation, updated_product) on success, or (None, None)
    if the product does not exist.
    Raises ValueError if cantidad <= 0 or insufficient stock.
    """
    if cantidad <= 0:
        raise ValueError("La cantidad a reservar debe ser mayor que 0")

    product = get_product_by_id(product_id)
    if product is None:
        return None, None

    if product.cantidad < cantidad:
        raise ValueError(
            f"Stock insuficiente para reserva: disponible {product.cantidad}, solicitado {cantidad}"
        )

    new_cantidad = product.cantidad - cantidad
    updated = update_product_stock(product_id, new_cantidad)
    if updated is None:
        return None, None

    reservation = StockReservation(
        product_id=product_id,
        sku=product.sku,
        cantidad=cantidad,
    )
    reservations_table = get_stock_reservations_table()
    reservations_table.insert(reservation.model_dump(mode="json"))

    _record_movement(
        product_id=product.id,
        sku=product.sku,
        tipo=StockMovementType.RESERVATION,
        cantidad=cantidad,
        motivo="Reserva de stock",
    )
    return reservation, updated


def release_reservation(reservation_id: str) -> bool:
    """Release a stock reservation, returning stock to inventory.

    Returns True if the reservation was found and released,
    False if the reservation does not exist.
    """
    reservations_table = get_stock_reservations_table()
    query = Query()
    document = reservations_table.get(query.id == reservation_id)
    if document is None:
        return False

    reservation = StockReservation.model_validate(dict(document))

    product = get_product_by_id(reservation.product_id)
    if product is not None:
        new_cantidad = product.cantidad + reservation.cantidad
        update_product_stock(reservation.product_id, new_cantidad)
        _record_movement(
            product_id=product.id,
            sku=product.sku,
            tipo=StockMovementType.RELEASE,
            cantidad=reservation.cantidad,
            motivo="Liberación de reserva",
        )

    reservations_table.remove(doc_ids=[document.doc_id])
    return True


def hay_stock_bajo(sku: str) -> bool:
    """Check if the product with the given SKU has stock below the minimum threshold."""
    product = get_product_by_sku(sku)
    if product is None:
        return False
    return product.cantidad <= product.stock_minimo


# ──────────────────────────────────────────────
# Movements ledger
# ──────────────────────────────────────────────


def _record_movement(
    product_id: str,
    sku: str,
    tipo: StockMovementType,
    cantidad: int,
    motivo: str,
) -> StockMovement:
    """Internal helper to log a stock movement."""
    movements_table = get_stock_movements_table()
    movement = StockMovement(
        product_id=product_id,
        sku=sku,
        tipo=tipo,
        cantidad=cantidad,
        motivo=motivo,
    )
    movements_table.insert(movement.model_dump(mode="json"))
    return movement


def list_movements_by_product(product_id: str) -> list[StockMovement]:
    """Return all stock movements for a given product."""
    movements_table = get_stock_movements_table()
    query = Query()
    documents = movements_table.search(query.product_id == product_id)
    return [StockMovement.model_validate(dict(d)) for d in documents]


def list_movements_by_sku(sku: str) -> list[StockMovement]:
    """Return all stock movements for a given SKU."""
    movements_table = get_stock_movements_table()
    query = Query()
    documents = movements_table.search(query.sku == sku)
    return [StockMovement.model_validate(dict(d)) for d in documents]