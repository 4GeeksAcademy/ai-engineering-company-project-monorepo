from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[4]
CSV = REPO / "data" / "raw" / "incidents-nexova.csv"

ROW = {
    "ticket_id": "NXV-000500",
    "date": "2024-03-05",
    "client_company": "Acme",
    "category": "BILLING",
    "description": "Invoice shows the wrong VAT",
    "agent_id": "AGT-04",
    "status": "CLOSED",
    "customer_email": "pat@acme.com",
    "satisfaction_score": "4",
}


@pytest.fixture()
def row() -> dict[str, str]:
    return dict(ROW)
