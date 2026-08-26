from pathlib import Path

import seed
import database
import models
from tinydb import TinyDB


def test_seed_script_skips_duplicates_and_reports_inserts(tmp_path: Path, monkeypatch) -> None:
    path = tmp_path / "suppliers.json"
    monkeypatch.setattr(database, "SUPPLIERS_FILE", path)

    first = seed.load_context_suppliers()
    expected = [row["supplier_id"] for row in models.SEED_SUPPLIERS]
    assert first["inserted"] == expected
    assert first["skipped"] == []

    second = seed.load_context_suppliers()
    assert second["inserted"] == []
    assert second["skipped"] == expected

    table = TinyDB(path).table("suppliers")
    ids = [row["supplier_id"] for row in table.all()]
    assert ids == expected
    assert len(table) == len(expected)
    for row in table.all():
        database.as_response(row)
