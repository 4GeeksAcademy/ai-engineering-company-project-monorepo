"""Tests for inventory service — Gestión de Inventario.

Covers: Happy path (Camino feliz), Boundary (Caso límite), and
Failure modes (Modo de fallo) for stock query, reservation, and alerts.
"""

from __future__ import annotations

import pytest

from src.models.inventory import (
    ProductCategory,
    ProductCreate,
    StockMovementType,
    WarehouseLocation,
)
from src.services.inventory_service import (
    add_stock,
    create_product,
    get_product_by_id,
    get_product_by_sku,
    hay_stock_bajo,
    list_movements_by_product,
    list_movements_by_sku,
    list_products,
    release_reservation,
    remove_stock,
    reserve_stock,
    update_product_stock,
)


# ======================================================================
# create_product
# ======================================================================


class TestCreateProduct:
    def test_create_valid_product(self, clean_logistics_db):
        """Happy path: create a product with valid data → returns Product with id."""
        payload = ProductCreate(nombre="Monitor 4K", sku="MON-001", cantidad=20, precio=300.0)
        product = create_product(payload)

        assert product.id is not None
        assert product.nombre == "Monitor 4K"
        assert product.sku == "MON-001"
        assert product.cantidad == 20
        assert product.precio == 300.0
        assert product.categoria == ProductCategory.OTROS

    def test_create_product_zero_stock(self, clean_logistics_db):
        """Boundary: initial stock of 0 is allowed."""
        payload = ProductCreate(nombre="Teclado", sku="TEC-001", cantidad=0)
        product = create_product(payload)
        assert product.cantidad == 0

    def test_create_product_max_name_length(self, clean_logistics_db):
        """Boundary: product name at max 200 characters."""
        name = "A" * 200
        payload = ProductCreate(nombre=name, sku="MAX-001")
        product = create_product(payload)
        assert len(product.nombre) == 200

    def test_create_product_negative_cantidad_fails(self, clean_logistics_db):
        """Failure mode: negative quantity should be rejected by Pydantic."""
        with pytest.raises(Exception):
            ProductCreate(nombre="Fallo", sku="ERR-001", cantidad=-5)

    def test_create_product_negative_precio_fails(self, clean_logistics_db):
        """Failure mode: negative price should be rejected by Pydantic."""
        with pytest.raises(Exception):
            ProductCreate(nombre="Fallo", sku="ERR-002", precio=-1.0)


# ======================================================================
# get_product_by_id / get_product_by_sku
# ======================================================================


class TestGetProduct:
    def test_get_by_id_found(self, sample_product):
        """Happy path: existing product ID → returns Product."""
        product = get_product_by_id(sample_product.id)
        assert product is not None
        assert product.sku == sample_product.sku

    def test_get_by_id_not_found(self, clean_logistics_db):
        """Failure mode: non-existent ID → returns None."""
        result = get_product_by_id("non-existent-id")
        assert result is None

    def test_get_by_sku_found(self, sample_product):
        """Happy path: existing SKU → returns Product."""
        product = get_product_by_sku(sample_product.sku)
        assert product is not None
        assert product.id == sample_product.id

    def test_get_by_sku_not_found(self, clean_logistics_db):
        """Failure mode: SKU que no existe → returns None."""
        result = get_product_by_sku("SKU-NO-EXISTE")
        assert result is None

    def test_get_by_sku_empty_string(self, clean_logistics_db):
        """Boundary: empty SKU string → returns None (no match)."""
        result = get_product_by_sku("")
        assert result is None


# ======================================================================
# list_products
# ======================================================================


class TestListProducts:
    def test_list_all(self, sample_product, low_stock_product):
        """Happy path: list all products."""
        products = list_products()
        assert len(products) >= 2

    def test_list_by_category(self, sample_product, clean_logistics_db):
        """Happy path: filter by categoria."""
        products = list_products(categoria=ProductCategory.ELECTRONICA.value)
        assert all(p.categoria == ProductCategory.ELECTRONICA.value for p in products)

    def test_list_by_category_no_match(self, clean_logistics_db):
        """Boundary: category with no products → empty list."""
        products = list_products(categoria=ProductCategory.HOGAR.value)
        assert products == []

    def test_list_by_ubicacion(self, sample_product, clean_logistics_db):
        """Happy path: filter by ubicacion."""
        products = list_products(ubicacion=WarehouseLocation.CENTRAL.value)
        assert all(p.ubicacion == WarehouseLocation.CENTRAL.value for p in products)

    def test_list_stock_bajo(self, low_stock_product, sample_product):
        """Happy path: stock_bajo filter returns only products below threshold.

        low_stock_product has cantidad=3 and stock_minimo=10 → should appear.
        sample_product has cantidad=50 and stock_minimo=10 → should NOT appear.
        """
        products = list_products(stock_bajo=True)
        skus = [p.sku for p in products]
        assert low_stock_product.sku in skus
        assert sample_product.sku not in skus

    def test_list_stock_bajo_empty(self, clean_logistics_db):
        """Boundary: no products with low stock → empty list."""
        products = list_products(stock_bajo=True)
        assert products == []

    def test_list_combined_filters(self, sample_product, clean_logistics_db):
        """Boundary: combined category + ubicacion filter."""
        products = list_products(
            categoria=ProductCategory.ELECTRONICA.value,
            ubicacion=WarehouseLocation.CENTRAL.value,
        )
        assert len(products) >= 1


# ======================================================================
# update_product_stock
# ======================================================================


class TestUpdateProductStock:
    def test_update_stock_valid(self, sample_product):
        """Happy path: set stock to a valid quantity."""
        updated = update_product_stock(sample_product.id, 100)
        assert updated is not None
        assert updated.cantidad == 100

    def test_update_stock_zero(self, sample_product):
        """Boundary: set stock to 0."""
        updated = update_product_stock(sample_product.id, 0)
        assert updated is not None
        assert updated.cantidad == 0

    def test_update_stock_negative_fails(self, sample_product):
        """Failure mode: negative quantity raises ValueError."""
        with pytest.raises(ValueError, match="no puede ser negativa"):
            update_product_stock(sample_product.id, -1)

    def test_update_stock_nonexistent_product(self, clean_logistics_db):
        """Failure mode: product ID not found → returns None."""
        result = update_product_stock("no-existe", 10)
        assert result is None


# ======================================================================
# add_stock / remove_stock
# ======================================================================


class TestAddStock:
    def test_add_stock_valid(self, sample_product):
        """Happy path: add stock increases quantity."""
        product = add_stock(sample_product.id, 10, motivo="Reabastecimiento")
        assert product is not None
        assert product.cantidad == sample_product.cantidad + 10

    def test_add_stock_zero_fails(self, sample_product):
        """Failure mode: cantidad=0 raises ValueError."""
        with pytest.raises(ValueError, match="mayor que 0"):
            add_stock(sample_product.id, 0)

    def test_add_stock_negative_fails(self, sample_product):
        """Failure mode: negative quantity raises ValueError."""
        with pytest.raises(ValueError, match="mayor que 0"):
            add_stock(sample_product.id, -5)

    def test_add_stock_nonexistent_product(self, clean_logistics_db):
        """Failure mode: non-existent product → returns None."""
        result = add_stock("no-existe", 10)
        assert result is None

    def test_add_stock_records_movement(self, sample_product):
        """Happy path: add stock creates an inbound movement record."""
        add_stock(sample_product.id, 5, motivo="Prueba movimiento")
        movements = list_movements_by_product(sample_product.id)
        inbound = [m for m in movements if m.tipo == StockMovementType.INBOUND]
        assert len(inbound) >= 1
        assert inbound[-1].cantidad == 5
        assert inbound[-1].motivo == "Prueba movimiento"


class TestRemoveStock:
    def test_remove_stock_valid(self, sample_product):
        """Happy path: remove stock decreases quantity."""
        product = remove_stock(sample_product.id, 10, motivo="Venta")
        assert product is not None
        assert product.cantidad == sample_product.cantidad - 10

    def test_remove_stock_insufficient(self, sample_product):
        """Failure mode: remove more than available raises ValueError."""
        with pytest.raises(ValueError, match="Stock insuficiente"):
            remove_stock(sample_product.id, 9999)

    def test_remove_stock_zero_fails(self, sample_product):
        """Failure mode: cantidad=0 raises ValueError."""
        with pytest.raises(ValueError, match="mayor que 0"):
            remove_stock(sample_product.id, 0)

    def test_remove_stock_negative_fails(self, sample_product):
        """Failure mode: negative quantity raises ValueError."""
        with pytest.raises(ValueError, match="mayor que 0"):
            remove_stock(sample_product.id, -3)

    def test_remove_stock_nonexistent(self, clean_logistics_db):
        """Failure mode: non-existent product → returns None."""
        result = remove_stock("no-existe", 10)
        assert result is None

    def test_remove_all_stock(self, sample_product):
        """Boundary: remove exact amount available → stock becomes 0."""
        product = remove_stock(sample_product.id, sample_product.cantidad)
        assert product is not None
        assert product.cantidad == 0

    def test_remove_stock_records_movement(self, sample_product):
        """Happy path: remove stock creates an outbound movement record."""
        remove_stock(sample_product.id, 5, motivo="Venta prueba")
        movements = list_movements_by_product(sample_product.id)
        outbound = [m for m in movements if m.tipo == StockMovementType.OUTBOUND]
        assert len(outbound) >= 1


# ======================================================================
# reserve_stock / release_reservation
# ======================================================================


class TestReserveStock:
    def test_reserve_valid(self, sample_product):
        """Happy path: reserve stock reduces quantity and creates reservation."""
        reservation, product = reserve_stock(sample_product.id, 10)
        assert reservation is not None
        assert product is not None
        assert product.cantidad == sample_product.cantidad - 10
        assert reservation.sku == sample_product.sku
        assert reservation.cantidad == 10

    def test_reserve_insufficient_stock(self, sample_product):
        """Failure mode: reserve more than available raises ValueError."""
        with pytest.raises(ValueError, match="Stock insuficiente para reserva"):
            reserve_stock(sample_product.id, 9999)

    def test_reserve_zero_fails(self, sample_product):
        """Failure mode: cantidad=0 raises ValueError."""
        with pytest.raises(ValueError, match="mayor que 0"):
            reserve_stock(sample_product.id, 0)

    def test_reserve_negative_fails(self, sample_product):
        """Failure mode: cantidad negativa raises ValueError."""
        with pytest.raises(ValueError, match="mayor que 0"):
            reserve_stock(sample_product.id, -1)

    def test_reserve_nonexistent_product(self, clean_logistics_db):
        """Failure mode: non-existent product → returns None, None."""
        reservation, product = reserve_stock("no-existe", 10)
        assert reservation is None
        assert product is None

    def test_reserve_all_stock(self, sample_product):
        """Boundary: reserve entire stock → stock becomes 0."""
        reservation, product = reserve_stock(sample_product.id, sample_product.cantidad)
        assert product is not None
        assert product.cantidad == 0
        assert reservation is not None


class TestReleaseReservation:
    def test_release_valid(self, sample_product):
        """Happy path: release reservation returns stock to inventory."""
        reservation, _ = reserve_stock(sample_product.id, 5)
        assert reservation is not None
        product_before = get_product_by_id(sample_product.id)
        assert product_before is not None
        cant_before_reserve = product_before.cantidad  # Already reduced

        result = release_reservation(reservation.id)
        assert result is True

        product_after = get_product_by_id(sample_product.id)
        assert product_after is not None
        assert product_after.cantidad == cant_before_reserve + 5

    def test_release_nonexistent(self, clean_logistics_db):
        """Failure mode: release non-existent reservation → returns False."""
        result = release_reservation("no-existe")
        assert result is False

    def test_release_twice_fails(self, sample_product):
        """Failure mode: releasing the same reservation twice → second returns False."""
        reservation, _ = reserve_stock(sample_product.id, 3)
        assert reservation is not None
        first = release_reservation(reservation.id)
        assert first is True
        second = release_reservation(reservation.id)
        assert second is False


# ======================================================================
# hay_stock_bajo
# ======================================================================


class TestHayStockBajo:
    def test_stock_bajo_true(self, low_stock_product):
        """Happy path: product with stock below minimum → returns True."""
        assert hay_stock_bajo(low_stock_product.sku) is True

    def test_stock_bajo_false(self, sample_product):
        """Happy path: product with sufficient stock → returns False."""
        assert hay_stock_bajo(sample_product.sku) is False

    def test_stock_bajo_at_threshold(self, clean_logistics_db):
        """Boundary: cantidad == stock_minimo → is considered low stock."""
        payload = ProductCreate(
            nombre="Producto Límite",
            sku="LIM-001",
            cantidad=10,
            stock_minimo=10,
        )
        product = create_product(payload)
        assert hay_stock_bajo(product.sku) is True

    def test_stock_bajo_sku_not_found(self, clean_logistics_db):
        """Failure mode: SKU que no existe → returns False."""
        assert hay_stock_bajo("SKU-INEXISTENTE") is False

    def test_stock_bajo_empty_sku(self, clean_logistics_db):
        """Boundary: empty SKU → returns False."""
        assert hay_stock_bajo("") is False

    def test_stock_bajo_zero_stock(self, clean_logistics_db):
        """Boundary: product with 0 stock → is low stock."""
        payload = ProductCreate(nombre="Sin Stock", sku="ZER-001", cantidad=0, stock_minimo=5)
        product = create_product(payload)
        assert hay_stock_bajo(product.sku) is True


# ======================================================================
# Stock movement ledger
# ======================================================================


class TestStockMovements:
    def test_list_movements_by_product(self, sample_product):
        """Happy path: list all movements for a product."""
        add_stock(sample_product.id, 10, motivo="Entrada")
        remove_stock(sample_product.id, 5, motivo="Salida")
        movements = list_movements_by_product(sample_product.id)
        assert len(movements) >= 2

    def test_list_movements_by_sku(self, sample_product):
        """Happy path: list movements for a SKU."""
        add_stock(sample_product.id, 5, motivo="Reposición")
        movements = list_movements_by_sku(sample_product.sku)
        assert len(movements) >= 1
        assert movements[-1].sku == sample_product.sku

    def test_list_movements_no_data(self, clean_logistics_db):
        """Boundary: product with no movements → empty list."""
        payload = ProductCreate(nombre="Test", sku="NOM-001", cantidad=1)
        product = create_product(payload)
        movements = list_movements_by_product(product.id)
        assert movements == []

    def test_list_movements_by_sku_no_data(self, clean_logistics_db):
        """Boundary: SKU with no movements → empty list."""
        movements = list_movements_by_sku("SKU-SIN-MOV")
        assert movements == []