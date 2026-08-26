"""TinyDB initialisation for the Brasaland supplier directory."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from tinydb import TinyDB

import models

REPO_ROOT = Path(__file__).resolve().parents[2]
SUPPLIERS_FILE = REPO_ROOT / "data" / "suppliers.json"
SUPPLIERS_TABLE = "suppliers"


def _open_db() -> TinyDB:
    SUPPLIERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if SUPPLIERS_FILE.exists() and SUPPLIERS_FILE.stat().st_size > 0:
        try:
            raw = json.loads(SUPPLIERS_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            raw = None
        if isinstance(raw, list):
            SUPPLIERS_FILE.write_text("{}\n", encoding="utf-8")
            database = TinyDB(SUPPLIERS_FILE, indent=2, ensure_ascii=False)
            table = database.table(SUPPLIERS_TABLE)
            for row in raw:
                table.insert(row)
            return database
    return TinyDB(SUPPLIERS_FILE, indent=2, ensure_ascii=False)


def suppliers_table():
    return _open_db().table(SUPPLIERS_TABLE)


def as_response(document: Any) -> models.SupplierResponse:
    payload = dict(document)
    doc_id = getattr(document, "doc_id", None)
    if doc_id is None:
        doc_id = payload.get("id")
    payload["id"] = int(doc_id)
    return models.SupplierResponse.model_validate(payload)


def storage_payload(record: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in record.items() if key != "id"}


def seed_suppliers_file() -> None:
    table = suppliers_table()
    if len(table) > 0:
        return
    stamped = models.utc_now()
    for row in models.SEED_SUPPLIERS:
        table.insert({**row, "updated_at": stamped})


def read_suppliers() -> list[Any]:
    seed_suppliers_file()
    return list(suppliers_table().all())


def insert_validated(record: dict[str, Any]) -> int:
    return int(suppliers_table().insert(storage_payload(record)))


def replace_validated(lookup: str, record: models.SupplierResponse) -> None:
    from fastapi import HTTPException

    table = suppliers_table()
    updated = table.update(storage_payload(record.model_dump()), doc_ids=[record.id])
    if not updated:
        raise HTTPException(status_code=404, detail=f"Supplier {lookup} was not found.")
