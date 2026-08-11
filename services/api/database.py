from __future__ import annotations

import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from tinydb import Query, TinyDB
from tinydb.table import Document, Table

DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "tinydb" / "suppliers.json"
SUPPLIERS_TABLE = "suppliers"

_database: TinyDB | None = None
_database_path: Path | None = None


def utc_now() -> datetime:
    return datetime.now(UTC)


def get_database() -> TinyDB:
    global _database, _database_path

    configured_path = Path(os.getenv("TRACKFLOW_TINYDB_PATH", str(DEFAULT_DB_PATH))).resolve()
    configured_path.parent.mkdir(parents=True, exist_ok=True)

    if _database is None or _database_path != configured_path:
        if _database is not None:
            _database.close()
        _database = TinyDB(configured_path)
        _database_path = configured_path

    return _database


def close_database() -> None:
    global _database, _database_path

    if _database is not None:
        _database.close()
    _database = None
    _database_path = None


def get_suppliers_table() -> Table:
    return get_database().table(SUPPLIERS_TABLE)


def serialize_supplier(data: dict[str, Any]) -> dict[str, Any]:
    payload = dict(data)
    updated_at = payload.get("updated_at")
    if isinstance(updated_at, datetime):
        payload["updated_at"] = updated_at.isoformat()
    return payload


def document_to_supplier(document: Document) -> dict[str, Any]:
    payload = dict(document)
    payload["id"] = document.doc_id
    return payload


def get_supplier_document(supplier_id: int) -> Document | None:
    return get_suppliers_table().get(doc_id=supplier_id)


def insert_supplier_record(data: dict[str, Any]) -> dict[str, Any]:
    table = get_suppliers_table()
    supplier_id = table.insert(serialize_supplier(data))
    document = table.get(doc_id=supplier_id)
    if document is None:
        raise RuntimeError("Supplier could not be retrieved after insert")
    return document_to_supplier(document)


def update_supplier_record(supplier_id: int, changes: dict[str, Any]) -> dict[str, Any] | None:
    table = get_suppliers_table()
    table.update(serialize_supplier(changes), doc_ids=[supplier_id])
    document = table.get(doc_id=supplier_id)
    if document is None:
        return None
    return document_to_supplier(document)


def delete_supplier_record(supplier_id: int) -> bool:
    table = get_suppliers_table()
    if table.get(doc_id=supplier_id) is None:
        return False
    table.remove(doc_ids=[supplier_id])
    return True


def list_supplier_records(country: str | None = None, category: str | None = None) -> list[dict[str, Any]]:
    table = get_suppliers_table()
    query = Query()

    condition = None
    if country is not None:
        condition = query.country == country
    if category is not None:
        category_condition = query.categories.any([category])
        condition = category_condition if condition is None else condition & category_condition

    documents = table.search(condition) if condition is not None else table.all()
    return [document_to_supplier(document) for document in documents]


def supplier_exists(name: str, country: str) -> bool:
    query = Query()
    return get_suppliers_table().contains((query.name == name) & (query.country == country))
