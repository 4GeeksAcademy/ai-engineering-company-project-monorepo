from fastapi.testclient import TestClient


def test_backoffice_serves_supplier_directory(client: TestClient) -> None:
    menu = client.get("/backoffice/")
    assert menu.status_code == 200
    assert 'aria-label="Application menu"' in menu.text
    assert 'href="/application/app/suppliers/"' in menu.text

    response = client.get("/application/app/suppliers/")
    assert response.status_code == 200
    html = response.text
    assert "Supplier Directory" in html
    assert 'aria-label="Application menu"' in html
    assert 'id="filter-country"' in html
    assert 'id="filter-category"' in html
    assert 'id="supplier-form"' in html
    assert "Register a new supplier" in html
    assert 'id="register-supplier"' in html
    assert "novalidate" in html
    assert 'id="form-status"' in html
    assert 'role="alert"' in html
    assert 'id="supplier-table"' in html
    assert "<th>Name</th>" in html
    assert "<th>Country</th>" in html
    assert "<th>Categories</th>" in html
    assert "Emergency surcharge %" in html
    assert 'id="status-lifecycle"' in html
    assert "Activate" in html
    assert "Suspend" in html
    assert "emergency_surcharge_pct" in html
    assert "/application/app/suppliers/suppliers.js" in html

    script = client.get("/application/app/suppliers/suppliers.js")
    assert script.status_code == 200
    assert "/rate" in script.text
    assert "emergency_surcharge_pct" in script.text
    assert 'data-action="update-rate"' in script.text
    assert "/status" in script.text
    assert 'data-action="set-status"' in script.text
    assert 'data-status="active"' in script.text
    assert 'data-status="suspend"' in script.text
    assert "supplier-row--" in script.text
    assert "status-suspended" in script.text
