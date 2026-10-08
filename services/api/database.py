"""TinyDB data access for suppliers.

Routes only talk to SupplierRepository, so moving to Postgres later means
rewriting this module without touching the API layer. Documents are stored as
JSON (dates and datetimes in ISO 8601) and turned back into models on read.
"""

from __future__ import annotations

import os
import threading
from datetime import UTC, datetime
from pathlib import Path

from tinydb import Query, TinyDB
from tinydb.table import Document

from models import Category, Country, Supplier, SupplierCreate, SupplierStatus

API_ROOT = Path(__file__).resolve().parent
DEFAULT_DB_PATH = API_ROOT / "data" / "suppliers.json"
DB_PATH_ENV = "SUPPLIERS_DB_PATH"


def db_path_from_env() -> Path:
    return Path(os.environ.get(DB_PATH_ENV) or DEFAULT_DB_PATH)


def _now() -> str:
    return datetime.now(UTC).isoformat()


class SupplierRepository:
    def __init__(self, path: Path | str) -> None:
        self._db = TinyDB(path, create_dirs=True, encoding="utf-8", ensure_ascii=False, indent=2)
        self._table = self._db.table("suppliers")
        # TinyDB is not thread-safe and FastAPI runs sync routes in a thread pool.
        self._lock = threading.Lock()

    def close(self) -> None:
        self._db.close()

    @staticmethod
    def _to_model(doc: Document) -> Supplier:
        return Supplier.model_validate({**doc, "id": doc.doc_id})

    def count(self) -> int:
        with self._lock:
            return len(self._table)

    def exists_name(self, name: str) -> bool:
        with self._lock:
            return self._table.contains(Query().name == name)

    def list(self, country: Country | None = None, category: Category | None = None) -> list[Supplier]:
        supplier = Query()
        conditions = []
        if country is not None:
            conditions.append(supplier.country == country.value)
        if category is not None:
            conditions.append(supplier.categories.any([category.value]))
        with self._lock:
            if not conditions:
                docs = self._table.all()
            else:
                condition = conditions[0]
                for extra in conditions[1:]:
                    condition &= extra
                docs = self._table.search(condition)
        return [self._to_model(doc) for doc in docs]

    def get(self, supplier_id: int) -> Supplier | None:
        with self._lock:
            doc = self._table.get(doc_id=supplier_id)
        return self._to_model(doc) if doc else None

    def create(self, data: SupplierCreate) -> Supplier:
        record = {**data.model_dump(mode="json"), "updated_at": _now()}
        with self._lock:
            doc_id = self._table.insert(record)
            doc = self._table.get(doc_id=doc_id)
        return self._to_model(doc)

    def _update(self, supplier_id: int, fields: dict) -> Supplier | None:
        with self._lock:
            if not self._table.contains(doc_id=supplier_id):
                return None
            self._table.update(fields, doc_ids=[supplier_id])
            doc = self._table.get(doc_id=supplier_id)
        return self._to_model(doc)

    def update_rate(self, supplier_id: int, monthly_rate: float) -> Supplier | None:
        return self._update(supplier_id, {"monthly_rate": monthly_rate, "updated_at": _now()})

    def update_status(self, supplier_id: int, status: SupplierStatus) -> Supplier | None:
        return self._update(supplier_id, {"status": status.value})

    def delete(self, supplier_id: int) -> bool:
        with self._lock:
            # TinyDB raises KeyError when removing an unknown doc_id.
            if not self._table.contains(doc_id=supplier_id):
                return False
            self._table.remove(doc_ids=[supplier_id])
            return True
