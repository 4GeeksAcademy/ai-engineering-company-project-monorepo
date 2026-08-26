from __future__ import annotations

"""CSV-backed inventory FastAPI application.

Run the full company API (includes these routes):
    uvicorn api.app:app --reload

Or this inventory app on its own:
    uvicorn api.inventory:app --reload --port 8000

Products persist in products.csv at the repository root.
"""

import csv
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

REPO_ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_FILE = REPO_ROOT / "products.csv"
FIELDNAMES = ["product_id", "name", "quantity", "unit", "location", "weekly_demand"]
LOCATIONS = ("Downtown", "Riverside")

ERROR_RESPONSES = {
    400: {"description": "Invalid request or business rule violation"},
    404: {"description": "Product not found"},
    409: {"description": "Product id already exists"},
    422: {"description": "Request validation failed"},
    500: {"description": "Inventory file could not be read or written"},
}


def _http_error(status_code: int, message: str) -> None:
    raise HTTPException(status_code=status_code, detail=message)


def register_error_handlers(application: FastAPI) -> None:
    """Return a descriptive `detail` string for inventory validation errors."""

    @application.exception_handler(RequestValidationError)
    async def inventory_validation_handler(request: Request, exc: RequestValidationError):
        if not request.url.path.startswith("/inventory"):
            return await request_validation_exception_handler(request, exc)
        parts: list[str] = []
        for err in exc.errors():
            field = ".".join(str(item) for item in err.get("loc", ()) if item != "body")
            prefix = f"{field}: " if field else ""
            parts.append(f"{prefix}{err.get('msg', 'Invalid value')}")
        message = "Invalid request. " + "; ".join(parts)
        return JSONResponse(status_code=422, content={"detail": message})


class Product(BaseModel):
    product_id: int
    name: str
    quantity: int
    unit: str
    location: str
    weekly_demand: int


class ProductCreate(BaseModel):
    name: str = Field(min_length=1)
    quantity: int = Field(ge=0)
    unit: str = Field(min_length=1)
    location: str = Field(default="Downtown", min_length=1)
    weekly_demand: int = Field(default=0, ge=0)


class StockDelta(BaseModel):
    delta: int = Field(
        description="Stock change: positive for incoming stock, negative for outgoing",
    )


router = APIRouter(prefix="/inventory", tags=["inventory"])


def _ensure_products_file() -> None:
    if PRODUCTS_FILE.exists():
        return
    with PRODUCTS_FILE.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()


def _normalize_location(location: str) -> str:
    cleaned = location.strip()
    for known in LOCATIONS:
        if cleaned.lower() == known.lower():
            return known
    raise HTTPException(
        status_code=400,
        detail=(
            f"Unknown location '{location}'. "
            f"Use one of: {', '.join(LOCATIONS)}."
        ),
    )


def _row_to_product(row: dict[str, str]) -> dict[str, str | int]:
    return {
        "product_id": int(row["product_id"]),
        "name": row["name"],
        "quantity": int(row["quantity"]),
        "unit": row["unit"],
        "location": row.get("location") or LOCATIONS[0],
        "weekly_demand": int(row["weekly_demand"]) if row.get("weekly_demand") else 0,
    }


def load_products() -> list[dict[str, str | int]]:
    _ensure_products_file()
    try:
        with PRODUCTS_FILE.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
    except OSError as error:
        raise HTTPException(status_code=500, detail="Unable to read inventory file products.csv.") from error

    products: list[dict[str, str | int]] = []
    for row in rows:
        try:
            products.append(_row_to_product(row))
        except (KeyError, TypeError, ValueError) as error:
            raise HTTPException(
                status_code=500,
                detail="Invalid inventory data in products.csv. Expected columns: "
                + ", ".join(FIELDNAMES)
                + ".",
            ) from error
    return products


def save_products(products: list[dict[str, str | int]]) -> None:
    try:
        with PRODUCTS_FILE.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
            writer.writeheader()
            for product in products:
                writer.writerow({field: product[field] for field in FIELDNAMES})
    except OSError as error:
        raise HTTPException(status_code=500, detail="Unable to write inventory file products.csv.") from error


def _require_positive_product_id(product_id: int) -> None:
    if product_id < 1:
        _http_error(400, f"product_id must be a positive integer. Received: {product_id}.")


def _find_product(products: list[dict[str, str | int]], product_id: int) -> dict[str, str | int] | None:
    for product in products:
        if product["product_id"] == product_id:
            return product
    return None


def _matches_location(product: dict[str, str | int], location: str | None) -> bool:
    if location is None:
        return True
    return str(product["location"]).lower() == location.strip().lower()


def create_product(
    name: str,
    quantity: int,
    unit: str,
    location: str = "Downtown",
    weekly_demand: int = 0,
    product_id: int | None = None,
) -> dict[str, str | int]:
    products = load_products()
    if product_id is not None:
        _require_positive_product_id(product_id)
    name = name.strip()
    unit = unit.strip()
    if not name:
        _http_error(400, "Product name cannot be empty.")
    if not unit:
        _http_error(400, "Product unit cannot be empty.")
    if product_id is None:
        product_id = max((int(product["product_id"]) for product in products), default=0) + 1
    elif _find_product(products, product_id) is not None:
        _http_error(
            409,
            f"Cannot add product {product_id} because that product_id already exists. "
            "Choose a new id or use PATCH /inventory/{product_id} to update stock.",
        )

    product = {
        "product_id": product_id,
        "name": name,
        "quantity": quantity,
        "unit": unit,
        "location": _normalize_location(location),
        "weekly_demand": weekly_demand,
    }
    products.append(product)
    save_products(products)
    return product


def apply_delta(product_id: int, delta: int) -> dict[str, str | int]:
    _require_positive_product_id(product_id)
    products = load_products()
    product = _find_product(products, product_id)
    if product is None:
        _http_error(
            404,
            f"Product {product_id} was not found in inventory. "
            "Use GET /inventory to list valid product IDs.",
        )

    new_quantity = int(product["quantity"]) + delta
    if new_quantity < 0:
        _http_error(
            400,
            f"Insufficient stock for product {product_id} ({product['name']}). "
            f"Current quantity is {product['quantity']}; delta {delta} would result in {new_quantity}.",
        )

    product["quantity"] = new_quantity
    save_products(products)
    return product


def get_alerts(threshold: int = 10, location: str | None = None) -> list[dict[str, str | int]]:
    if threshold < 0:
        _http_error(400, f"threshold must be 0 or greater. Received: {threshold}.")
    return [
        product
        for product in load_products()
        if _matches_location(product, location) and int(product["quantity"]) < threshold
    ]


@router.get(
    "",
    response_model=list[Product],
    summary="Return the full product list",
    responses=ERROR_RESPONSES,
)
def list_inventory(location: str | None = Query(default=None)) -> list[dict[str, str | int]]:
    """Return every product stored in products.csv.

    Pass `location` only when you want one store; omit it for the full list.
    """
    products = load_products()
    if location is None:
        return products
    location = _normalize_location(location)
    return [product for product in products if _matches_location(product, location)]


@router.post(
    "",
    status_code=201,
    response_model=Product,
    summary="Add a product (auto-assigned id)",
    responses=ERROR_RESPONSES,
)
def add_product(body: ProductCreate) -> dict[str, str | int]:
    return create_product(body.name, body.quantity, body.unit, body.location, body.weekly_demand)


@router.get(
    "/alerts",
    response_model=list[Product],
    summary="Return products below the stock threshold",
    responses=ERROR_RESPONSES,
)
def low_stock_alerts(
    threshold: int = Query(default=10, description="Alert when quantity is below this value"),
    location: str | None = Query(default=None),
) -> list[dict[str, str | int]]:
    """Return all products whose quantity is below `threshold` (default 10 units)."""
    if location is not None:
        location = _normalize_location(location)
    return get_alerts(threshold, location)


@router.post(
    "/{product_id}",
    status_code=201,
    response_model=Product,
    summary="Add a new product (name, quantity, unit)",
    responses=ERROR_RESPONSES,
)
def add_product_with_id(product_id: int, body: ProductCreate) -> dict[str, str | int]:
    return create_product(
        name=body.name,
        quantity=body.quantity,
        unit=body.unit,
        location=body.location,
        weekly_demand=body.weekly_demand,
        product_id=product_id,
    )


@router.patch(
    "/{product_id}",
    response_model=Product,
    summary="Update stock of an existing product",
    responses=ERROR_RESPONSES,
)
def update_stock(product_id: int, body: StockDelta) -> dict[str, str | int]:
    """Apply a quantity delta to an existing product and persist it to products.csv.

    `delta` > 0 adds incoming stock (delivery).
    `delta` < 0 removes outgoing stock (sale or usage).
    Quantity cannot go below 0.
    """
    return apply_delta(product_id, body.delta)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _ensure_products_file()
    yield


app = FastAPI(
    title="Coffee Shop Inventory API",
    description="Inventory for Downtown and Riverside, stored in products.csv.",
    lifespan=lifespan,
)
app.include_router(router)
register_error_handlers(app)
