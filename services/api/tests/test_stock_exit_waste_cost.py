"""StockExitCreate's unit_cost <-> reason validation.

docs/company-briefing.md section 3's merma-cost decision: unit_cost is
captured AT REGISTRATION TIME for a waste exit (expired/kitchen_error/
theft_suspected), never derived from a prior inbound delivery, and must
never be set for an ordinary (non-waste) exit.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.schemas import StockExitCreate

BASE_FIELDS = {
    "ingredient_id": 7,
    "quantity": 2.5,
    "unit": "kg",
    "country": "Colombia",
    "city": "Medellín",
}


@pytest.mark.parametrize("reason", ["expired", "kitchen_error", "theft_suspected"])
def test_waste_reason_requires_unit_cost(reason):
    with pytest.raises(ValidationError, match="unit_cost is required"):
        StockExitCreate(**BASE_FIELDS, reason=reason)


@pytest.mark.parametrize("reason", ["expired", "kitchen_error", "theft_suspected"])
def test_waste_reason_accepts_unit_cost(reason):
    exit_create = StockExitCreate(**BASE_FIELDS, reason=reason, unit_cost=12500.0)
    assert exit_create.unit_cost == 12500.0


@pytest.mark.parametrize("reason", ["kitchen_use", "transfer", "other"])
def test_non_waste_reason_rejects_unit_cost(reason):
    with pytest.raises(ValidationError, match="must not be provided"):
        StockExitCreate(**BASE_FIELDS, reason=reason, unit_cost=12500.0)


@pytest.mark.parametrize("reason", ["kitchen_use", "transfer", "other"])
def test_non_waste_reason_without_unit_cost_is_valid(reason):
    exit_create = StockExitCreate(**BASE_FIELDS, reason=reason)
    assert exit_create.unit_cost is None


def test_default_reason_is_non_waste_and_needs_no_unit_cost():
    exit_create = StockExitCreate(**BASE_FIELDS)
    assert exit_create.reason == "kitchen_use"
    assert exit_create.unit_cost is None
