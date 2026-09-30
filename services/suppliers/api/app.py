from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from tinydb import TinyDB, Query as TinyQuery


BASE_DIR = Path(__file__).resolve().parents[3]
DB_FILE = BASE_DIR / "services" / "suppliers" / "suppliers.json"

VALID_CATEGORIES = [
    "carne",
    "verduras_y_hortalizas",
    "salsas_y_condimentos",
    "bebidas",
    "packaging",
    "productos_limpieza",
    "lacteos",
    "carbon_y_combustible",
]

VALID_STATUSES = ["active", "suspended"]


app = FastAPI(title="Brasaland Supplier Directory")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SupplierCreate(BaseModel):
    name: str
    country: str
    categories: list[str] = Field(min_length=1)
    rate_per_unit: float = Field(gt=0)
    currency: str
    status: str = "active"
    contact_email: str | None = None
    notes: str | None = None


class SupplierUpdate(BaseModel):
    rate_per_unit: float | None = Field(default=None, gt=0)
    status: str | None = None
    contact_email: str | None = None
    notes: str | None = None


def get_db():
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    return TinyDB(DB_FILE)


def validate_supplier(data):
    if data["country"] not in ["Colombia", "USA"]:
        raise HTTPException(
            status_code=400,
            detail="País inválido",
        )

    expected_currency = "COP" if data["country"] == "Colombia" else "USD"

    if data["currency"] != expected_currency:
        raise HTTPException(
            status_code=400,
            detail=f"La moneda para {data['country']} debe ser {expected_currency}",
        )

    invalid_categories = [
        category
        for category in data["categories"]
        if category not in VALID_CATEGORIES
    ]

    if invalid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Categorías inválidas: {invalid_categories}",
        )

    if data["status"] not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Estado inválido",
        )


@app.get("/suppliers")
def list_suppliers(
    country: str | None = None,
    category: str | None = None,
):
    db = get_db()
    suppliers = db.all()
    db.close()

    if country:
        suppliers = [
            supplier
            for supplier in suppliers
            if supplier["country"] == country
        ]

    if category:
        suppliers = [
            supplier
            for supplier in suppliers
            if category in supplier["categories"]
        ]

    return suppliers


@app.get("/suppliers/{supplier_id}")
def get_supplier(supplier_id: int):
    db = get_db()
    supplier = db.get(TinyQuery().id == supplier_id)
    db.close()

    if supplier is None:
        raise HTTPException(
            status_code=404,
            detail="Proveedor no encontrado",
        )

    return supplier


@app.post("/suppliers", status_code=201)
def create_supplier(supplier: SupplierCreate):
    data = supplier.model_dump()
    validate_supplier(data)

    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    db = get_db()

    existing = db.get(TinyQuery().name == data["name"])

    if existing:
        db.close()
        raise HTTPException(
            status_code=409,
            detail="Ya existe un proveedor con ese nombre",
        )

    supplier_id = db.insert(data)
    data["id"] = supplier_id

    db.update(
        {"id": supplier_id},
        doc_ids=[supplier_id],
    )

    db.close()

    return data


@app.patch("/suppliers/{supplier_id}")
def update_supplier(
    supplier_id: int,
    supplier: SupplierUpdate,
):
    db = get_db()

    existing = db.get(TinyQuery().id == supplier_id)

    if existing is None:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Proveedor no encontrado",
        )

    updates = supplier.model_dump(exclude_none=True)

    if "status" in updates and updates["status"] not in VALID_STATUSES:
        db.close()
        raise HTTPException(
            status_code=400,
            detail="Estado inválido",
        )

    if "rate_per_unit" in updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    db.update(
        updates,
        TinyQuery().id == supplier_id,
    )

    updated = db.get(TinyQuery().id == supplier_id)

    db.close()

    return updated


@app.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int):
    db = get_db()

    existing = db.get(TinyQuery().id == supplier_id)

    if existing is None:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Proveedor no encontrado",
        )

    db.remove(TinyQuery().id == supplier_id)

    db.close()

    return {
        "message": "Proveedor eliminado correctamente"
    }


@app.patch("/suppliers/{supplier_id}/rate")
def update_supplier_rate(
    supplier_id: int,
    rate_per_unit: float = Query(..., gt=0),
):
    db = get_db()

    existing = db.get(TinyQuery().id == supplier_id)

    if existing is None:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Proveedor no encontrado",
        )

    updated_at = datetime.now(timezone.utc).isoformat()

    db.update(
        {
            "rate_per_unit": rate_per_unit,
            "updated_at": updated_at,
        },
        TinyQuery().id == supplier_id,
    )

    updated = db.get(TinyQuery().id == supplier_id)

    db.close()

    return updated


@app.patch("/suppliers/{supplier_id}/status")
def update_supplier_status(
    supplier_id: int,
    status: str = Query(...),
):
    if status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail="Estado inválido",
        )

    db = get_db()

    existing = db.get(TinyQuery().id == supplier_id)

    if existing is None:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Proveedor no encontrado",
        )

    db.update(
        {"status": status},
        TinyQuery().id == supplier_id,
    )

    updated = db.get(TinyQuery().id == supplier_id)

    db.close()

    return updated