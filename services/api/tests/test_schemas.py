"""Tests for request and response schema boundaries."""

from datetime import date, datetime, timezone

import pytest
from pydantic import ValidationError

from app.models.schemas import (
    IncidentCreate,
    IncidentResponse,
    SupplierCreate,
    SupplierResponse,
)


@pytest.fixture
def incident_data():
    return {
        "incident_id": "BRS-000001",
        "date": date(2026, 9, 28),
        "location_id": "COL-01",
        "category": "EQUIPMENT",
        "description": "Grill temperature control failed",
        "status": "CLOSED",
        "satisfaction_score": 4,
        "reporter_id": "MGR-01",
    }


@pytest.fixture
def supplier_data():
    return {
        "full_name": "Camila Ospina",
        "email": "camila@example.com",
        "phone": "+57 300 123 4567",
        "country": "Colombia",
        "city": "Medellín",
        "how_did_you_find_us": "Recommendation",
        "date_of_birth": date(1990, 1, 1),
        "accepts_terms": True,
        "rate": 4.5,
    }


@pytest.mark.parametrize(
    ("create_model", "data_fixture"),
    [
        (IncidentCreate, "incident_data"),
        (SupplierCreate, "supplier_data"),
    ],
)
def test_create_models_reject_system_metadata(request, create_model, data_fixture):
    data = request.getfixturevalue(data_fixture)

    with pytest.raises(ValidationError):
        create_model(**data, created_at=datetime.now(timezone.utc))


@pytest.mark.parametrize(
    ("response_model", "data_fixture", "system_fields"),
    [
        (
            IncidentResponse,
            "incident_data",
            {"created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
        ),
        (
            SupplierResponse,
            "supplier_data",
            {
                "id": 1,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
        ),
    ],
)
def test_response_models_require_system_metadata(
    request, response_model, data_fixture, system_fields
):
    data = request.getfixturevalue(data_fixture)
    response_model(**data, **system_fields)

    with pytest.raises(ValidationError):
        response_model(**data)