from datetime import datetime, timezone
from decimal import Decimal

import pytest
from pydantic import ValidationError

from ai_engineering_company_project_monorepo.models.supplier import (
    Supplier,
    SupplierCreate,
    SupplierResponse,
    SupplierStatus,
)


def test_supplier_requires_all_fields_and_validates_values() -> None:
    updated_at = datetime.now(timezone.utc)

    supplier = Supplier(
        name="Talent Partners",
        country="Chile",
        product_categories=["recruiting"],
        rate=Decimal("125.50"),
        updated_at=updated_at,
        status="active",
    )

    assert supplier.name == "Talent Partners"
    assert supplier.rate == Decimal("125.50")
    assert supplier.updated_at == updated_at
    assert supplier.status is SupplierStatus.ACTIVE

    with pytest.raises(ValidationError):
        Supplier(name="Talent Partners")


def test_supplier_forbids_unsupported_fields() -> None:
    with pytest.raises(ValidationError):
        Supplier(
            name="Talent Partners",
            country="Chile",
            product_categories=["recruiting"],
            rate=Decimal("125.50"),
            updated_at=datetime.now(timezone.utc),
            status="active",
            extra_field="not supported",
        )


def test_supplier_create_and_response_have_separate_fields() -> None:
    supplier_data = {
        "name": "Talent Partners",
        "country": "Chile",
        "product_categories": ["recruiting"],
        "rate": Decimal("125.50"),
        "status": "active",
    }

    supplier_input = SupplierCreate(**supplier_data)
    assert supplier_input.name == "Talent Partners"
    with pytest.raises(ValidationError):
        SupplierCreate(**supplier_data, updated_at=datetime.now(timezone.utc))

    with pytest.raises(ValidationError):
        SupplierResponse(**supplier_data)


def test_supplier_accepts_suspended_and_rejects_unknown_status() -> None:
    supplier_data = {
        "name": "Talent Partners",
        "country": "Chile",
        "product_categories": ["recruiting"],
        "rate": Decimal("125.50"),
        "updated_at": datetime.now(timezone.utc),
    }

    supplier = Supplier(**supplier_data, status="suspended")
    assert supplier.status is SupplierStatus.SUSPENDED

    with pytest.raises(ValidationError):
        Supplier(**supplier_data, status="pending")


@pytest.mark.parametrize("rate", [Decimal("0"), Decimal("-0.01")])
def test_supplier_rejects_non_positive_rate(rate: Decimal) -> None:
    with pytest.raises(ValidationError):
        Supplier(
            name="Talent Partners",
            country="Chile",
            product_categories=["recruiting"],
            rate=rate,
            updated_at=datetime.now(timezone.utc),
            status="active",
        )