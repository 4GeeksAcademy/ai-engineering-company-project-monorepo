"""TinyDB persistence for suppliers."""

from pathlib import Path
from typing import Any

from tinydb import Query, TinyDB

DATA_DIR = Path(__file__).resolve().parent / "data"
DATABASE_PATH = DATA_DIR / "suppliers.json"
SUPPLIERS_TABLE = "suppliers"


def get_database() -> TinyDB:
    """Open the local persistent database, creating its directory if needed."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return TinyDB(DATABASE_PATH)


def list_suppliers(*, country: str | None = None, category: str | None = None) -> list[dict[str, Any]]:
    """Return supplier records matching any provided filters."""
    with get_database() as database:
        table = database.table(SUPPLIERS_TABLE)
        records = table.all()
    if country is not None:
        records = [record for record in records if record.get("country") == country]
    if category is not None:
        records = [record for record in records if category in record.get("categories", [])]
    return [{**record, "id": int(record.doc_id)} for record in records]


def get_supplier(supplier_id: int) -> dict[str, Any] | None:
    with get_database() as database:
        table = database.table(SUPPLIERS_TABLE)
        record = table.get(doc_id=supplier_id)
    return {**record, "id": int(record.doc_id)} if record else None


def insert_supplier(data: dict[str, Any]) -> dict[str, Any]:
    with get_database() as database:
        table = database.table(SUPPLIERS_TABLE)
        doc_id = table.insert(data)
    return {**data, "id": int(doc_id)}


def update_supplier(supplier_id: int, data: dict[str, Any]) -> dict[str, Any] | None:
    with get_database() as database:
        table = database.table(SUPPLIERS_TABLE)
        if table.get(doc_id=supplier_id) is None:
            return None
        table.update(data, doc_ids=[supplier_id])
        record = table.get(doc_id=supplier_id)
    return {**record, "id": int(record.doc_id)} if record else None


def delete_supplier(supplier_id: int) -> bool:
    with get_database() as database:
        table = database.table(SUPPLIERS_TABLE)
        if table.get(doc_id=supplier_id) is None:
            return False
        table.remove(doc_ids=[supplier_id])
    return True


def supplier_exists_by_name(name: str) -> bool:
    with get_database() as database:
        return database.table(SUPPLIERS_TABLE).contains(Query().name == name)
