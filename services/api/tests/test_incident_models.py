import pytest
from pydantic import ValidationError

from models import IncidentCreate, IncidentResponse, IncidentStatusUpdate


VALID_PAYLOAD = {
    "title": "Parcel lost in transit",
    "description": "Customer reports parcel missing since last carrier scan",
    "category": "lost_parcel",
    "origin": "customer",
    "branch": "la_office",
}


def test_incident_create_valid():
    incident = IncidentCreate(**VALID_PAYLOAD)
    assert incident.title == "Parcel lost in transit"
    assert incident.status == "open"


def test_incident_create_default_status_open():
    incident = IncidentCreate(**VALID_PAYLOAD)
    assert incident.status == "open"


def test_incident_create_trims_title_and_description():
    incident = IncidentCreate(**{
        **VALID_PAYLOAD,
        "title": "  Parcel lost  ",
        "description": "  Missing since last scan  ",
    })
    assert incident.title == "Parcel lost"
    assert incident.description == "Missing since last scan"


def test_incident_create_blank_title_rejected():
    with pytest.raises(ValidationError):
        IncidentCreate(**{**VALID_PAYLOAD, "title": "   "})


def test_incident_create_blank_description_rejected():
    with pytest.raises(ValidationError):
        IncidentCreate(**{**VALID_PAYLOAD, "description": "   "})


def test_incident_create_invalid_category_rejected():
    with pytest.raises(ValidationError):
        IncidentCreate(**{**VALID_PAYLOAD, "category": "not_a_category"})


def test_incident_create_invalid_status_rejected():
    with pytest.raises(ValidationError):
        IncidentCreate(**{**VALID_PAYLOAD, "status": "closed"})


def test_incident_create_invalid_origin_rejected():
    with pytest.raises(ValidationError):
        IncidentCreate(**{**VALID_PAYLOAD, "origin": "email"})


def test_incident_create_invalid_branch_rejected():
    with pytest.raises(ValidationError):
        IncidentCreate(**{**VALID_PAYLOAD, "branch": "madrid_office"})


def test_incident_create_does_not_accept_server_generated_fields():
    incident = IncidentCreate(**{
        **VALID_PAYLOAD,
        "id": 999,
        "created_at": "2024-01-01T00:00:00+00:00",
        "updated_at": "2024-01-01T00:00:00+00:00",
    })
    assert not hasattr(incident, "id")
    assert not hasattr(incident, "created_at")
    assert not hasattr(incident, "updated_at")


def test_incident_status_update_only_accepts_status():
    update = IncidentStatusUpdate(status="in_progress")
    assert update.status == "in_progress"
    assert set(IncidentStatusUpdate.model_fields.keys()) == {"status"}


def test_incident_models_do_not_include_customer_email():
    assert "customer_email" not in IncidentCreate.model_fields
    assert "customer_email" not in IncidentResponse.model_fields


def test_incident_models_do_not_include_historical_incident_id():
    # "id" on IncidentResponse is the TinyDB doc_id, not the historical
    # CSV incident_id (e.g. "TRF-000001") — that field must not exist.
    assert "incident_id" not in IncidentCreate.model_fields
    assert "incident_id" not in IncidentResponse.model_fields
