import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from tinydb import Query, TinyDB

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "data" / "suppliers.json"

# TinyDB is not thread-safe and FastAPI runs sync endpoints in a thread pool.
_lock = threading.RLock()
_db: Optional[TinyDB] = None


def get_db_path() -> Path:
    return Path(os.environ.get("SUPPLIERS_DB_PATH", DEFAULT_DB_PATH))


def get_db() -> TinyDB:
    global _db
    if _db is None:
        path = get_db_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        _db = TinyDB(path, indent=2, ensure_ascii=False)
    return _db


def close_db() -> None:
    global _db
    if _db is not None:
        _db.close()
        _db = None


def suppliers_table():
    return get_db().table("suppliers")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _with_id(doc) -> dict[str, Any]:
    return {**doc, "id": doc.doc_id}


def list_suppliers() -> list[dict[str, Any]]:
    with _lock:
        return [_with_id(doc) for doc in suppliers_table().all()]


def get_supplier(supplier_id: int) -> Optional[dict[str, Any]]:
    with _lock:
        doc = suppliers_table().get(doc_id=supplier_id)
        return _with_id(doc) if doc else None


def find_by_name(name: str) -> Optional[dict[str, Any]]:
    Supplier = Query()
    with _lock:
        doc = suppliers_table().get(
            Supplier.name.test(lambda value: value.casefold() == name.casefold())
        )
        return _with_id(doc) if doc else None


def insert_supplier(data: dict[str, Any]) -> dict[str, Any]:
    with _lock:
        record = {**data, "updated_at": now_iso()}
        doc_id = suppliers_table().insert(record)
        return {**record, "id": doc_id}


def update_supplier(supplier_id: int, changes: dict[str, Any]) -> Optional[dict[str, Any]]:
    with _lock:
        table = suppliers_table()
        if not table.contains(doc_id=supplier_id):
            return None
        table.update(changes, doc_ids=[supplier_id])
        return _with_id(table.get(doc_id=supplier_id))


def delete_supplier(supplier_id: int) -> bool:
    with _lock:
        table = suppliers_table()
        if not table.contains(doc_id=supplier_id):
            return False
        table.remove(doc_ids=[supplier_id])
        return True
