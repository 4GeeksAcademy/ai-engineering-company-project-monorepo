from pathlib import Path

from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[2]
SUPPLIERS_PAGE = REPO_ROOT / "uis" / "application" / "app" / "suppliers" / "page.tsx"
SUPPLIERS_UI = REPO_ROOT / "uis" / "application" / "app" / "suppliers" / "supplier-directory.tsx"
PACKAGE_JSON = REPO_ROOT / "uis" / "application" / "package.json"


def test_supplier_ui_is_next_typescript(client: TestClient) -> None:
    package = PACKAGE_JSON.read_text(encoding="utf-8")
    assert '"next"' in package
    assert '"react"' in package
    assert '"typescript"' in package

    page = SUPPLIERS_PAGE.read_text(encoding="utf-8")
    ui = SUPPLIERS_UI.read_text(encoding="utf-8")
    assert "SupplierDirectory" in page
    assert "emergency_surcharge_pct" in ui
    assert 'id="filter-country"' in ui
    assert 'id="filter-category"' in ui
    assert 'id="supplier-form"' in ui
    assert "Register a new supplier" in ui
    assert 'id="register-supplier"' in ui
    assert "noValidate" in ui
    assert 'id="form-status"' in ui
    assert 'role="alert"' in ui
    assert 'id="supplier-table"' in ui
    assert "<th>Name</th>" in ui
    assert "<th>Country</th>" in ui
    assert "<th>Categories</th>" in ui
    assert "Emergency surcharge %" in ui
    assert "Activate" in ui
    assert "Suspend" in ui
    assert 'data-action="update-rate"' in ui
    assert 'data-status="active"' in ui
    assert 'data-status="suspend"' in ui
    assert "supplier-row--" in ui
    assert "status-suspended" in ui
    assert "/rate" in ui
    assert "/status" in ui

    menu = client.get("/backoffice/")
    assert menu.status_code == 200
    assert 'aria-label="Application menu"' in menu.text
    assert 'href="/application/suppliers/"' in menu.text
