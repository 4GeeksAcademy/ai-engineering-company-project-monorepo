from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from tinydb import Query, TinyDB
from tinydb.table import Document

from services.api.models import SUPPLIERS_SEED, Supplier, SupplierCreate, SupplierStatus

DB_PATH = Path(__file__).resolve().parent / "data" / "suppliers.json"


def get_db() -> TinyDB:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return TinyDB(DB_PATH, indent=2, ensure_ascii=False)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _supplier_from_document(document: Document) -> Supplier:
    payload = dict(document)
    updated_at = payload.pop("updated_at")
    return Supplier(id=document.doc_id, updated_at=updated_at, **payload)


def _seed_identity(supplier: dict) -> tuple[str, str]:
    return supplier["name"], supplier["country"]


def list_suppliers(country: str | None = None, category: str | None = None) -> list[Supplier]:
    with get_db() as db:
        query = Query()
        documents = db.all()
        if country:
            documents = [document for document in documents if document.get("country") == country]
        if category:
            documents = [
                document
                for document in documents
                if category in document.get("categories", [])
            ]
        return [_supplier_from_document(document) for document in documents]


def get_supplier_by_id(supplier_id: int) -> Supplier | None:
    with get_db() as db:
        document = db.get(doc_id=supplier_id)
        if document is None:
            return None
        return _supplier_from_document(document)


def create_supplier(payload: SupplierCreate) -> Supplier:
    supplier_data = payload.dict()
    supplier_data["updated_at"] = _now_iso()
    with get_db() as db:
        doc_id = db.insert(supplier_data)
        document = db.get(doc_id=doc_id)
        return _supplier_from_document(document)


def update_supplier_rate(supplier_id: int, rate_per_shipment: float) -> Supplier | None:
    with get_db() as db:
        document = db.get(doc_id=supplier_id)
        if document is None:
            return None
        db.update(
            {"rate_per_shipment": rate_per_shipment, "updated_at": _now_iso()},
            doc_ids=[supplier_id],
        )
        updated_document = db.get(doc_id=supplier_id)
        return _supplier_from_document(updated_document)


def update_supplier_status(supplier_id: int, status: SupplierStatus) -> Supplier | None:
    with get_db() as db:
        document = db.get(doc_id=supplier_id)
        if document is None:
            return None
        db.update({"status": status.value}, doc_ids=[supplier_id])
        updated_document = db.get(doc_id=supplier_id)
        return _supplier_from_document(updated_document)


def delete_supplier(supplier_id: int) -> bool:
    with get_db() as db:
        document = db.get(doc_id=supplier_id)
        if document is None:
            return False
        db.remove(doc_ids=[supplier_id])
        return True


def seed_suppliers() -> int:
    inserted = 0
    seed_keys = {_seed_identity(supplier) for supplier in SUPPLIERS_SEED}

    with get_db() as db:
        existing = {
            _seed_identity(document)
            for document in db.all()
            if _seed_identity(document) in seed_keys
        }

        for supplier in SUPPLIERS_SEED:
            if _seed_identity(supplier) in existing:
                continue
            db.insert({**supplier, "updated_at": _now_iso()})
            inserted += 1

    return inserted
