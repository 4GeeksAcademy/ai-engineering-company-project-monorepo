from __future__ import annotations

import pytest
from pydantic import ValidationError

from services.api.models import SupplierCreate


def build_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "Valid Supplier",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 12.5,
        "currency": "USD",
        "status": "active",
    }
    payload.update(overrides)
    return payload


@pytest.mark.parametrize("country,currency", [("USA", "USD"), ("Spain", "EUR")])
def test_valid_country_currency_pairs(country: str, currency: str) -> None:
    supplier = SupplierCreate.model_validate(build_payload(country=country, currency=currency))
    assert supplier.country.value == country
    assert supplier.currency == currency


@pytest.mark.parametrize("country", ["Mexico", "France"])
def test_invalid_country_rejected(country: str) -> None:
    with pytest.raises(ValidationError):
        SupplierCreate.model_validate(build_payload(country=country))


@pytest.mark.parametrize("status", ["active", "suspended"])
def test_valid_statuses(status: str) -> None:
    supplier = SupplierCreate.model_validate(build_payload(status=status))
    assert supplier.status.value == status


def test_invalid_status_rejected() -> None:
    with pytest.raises(ValidationError):
        SupplierCreate.model_validate(build_payload(status="pending"))


def test_valid_category() -> None:
    supplier = SupplierCreate.model_validate(build_payload(categories=["carrier_last_mile", "reverse_logistics"]))
    assert supplier.categories == ["carrier_last_mile", "reverse_logistics"]


def test_invalid_category_rejected() -> None:
    with pytest.raises(ValidationError):
        SupplierCreate.model_validate(build_payload(categories=["unknown_category"]))


def test_empty_categories_rejected() -> None:
    with pytest.raises(ValidationError):
        SupplierCreate.model_validate(build_payload(categories=[]))


def test_positive_rate_is_valid() -> None:
    supplier = SupplierCreate.model_validate(build_payload(rate_per_shipment=1.01))
    assert supplier.rate_per_shipment == 1.01


@pytest.mark.parametrize("rate", [0, -1.5])
def test_non_positive_rate_rejected(rate: float) -> None:
    with pytest.raises(ValidationError):
        SupplierCreate.model_validate(build_payload(rate_per_shipment=rate))


@pytest.mark.parametrize(
    "country,currency",
    [("USA", "EUR"), ("Spain", "USD")],
)
def test_invalid_country_currency_pairs_rejected(country: str, currency: str) -> None:
    with pytest.raises(ValidationError):
        SupplierCreate.model_validate(build_payload(country=country, currency=currency))
