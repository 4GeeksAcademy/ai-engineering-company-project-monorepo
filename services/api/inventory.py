from __future__ import annotations

import csv
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union

from fastapi import APIRouter, HTTPException

logger = logging.getLogger("brasaland.inventory")
from pydantic import BaseModel, Field

REPO_ROOT = Path(__file__).resolve().parents[2]
PRODUCTS_FILE = REPO_ROOT / "products.csv"
FIELDNAMES = ["product_id", "name", "quantity", "unit"]

ProductRow = Dict[str, Union[str, int]]

router = APIRouter(prefix="/inventory", tags=["inventory"])


class ProductCreate(BaseModel):
    name: str = Field(min_length=1)
    quantity: int = Field(ge=0)
    unit: str = Field(min_length=1)


class StockDelta(BaseModel):
    delta: int


def _ensure_products_file() -> None:
    if PRODUCTS_FILE.exists():
        return
    try:
        with PRODUCTS_FILE.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
            writer.writeheader()
    except OSError as error:
        raise HTTPException(status_code=500, detail="Unable to create inventory file") from error


def load_products() -> List[ProductRow]:
    _ensure_products_file()
    try:
        with PRODUCTS_FILE.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
    except OSError as error:
        raise HTTPException(status_code=500, detail="Unable to read inventory file") from error

    products: List[ProductRow] = []
    for row in rows:
        try:
            products.append(
                {
                    "product_id": int(row["product_id"]),
                    "name": row["name"],
                    "quantity": int(row["quantity"]),
                    "unit": row["unit"],
                }
            )
        except (KeyError, TypeError, ValueError):
            logger.warning("Skipping invalid inventory row")
            continue
    return products


def save_products(products: List[ProductRow]) -> None:
    try:
        with PRODUCTS_FILE.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
            writer.writeheader()
            for product in products:
                writer.writerow(
                    {
                        "product_id": product["product_id"],
                        "name": product["name"],
                        "quantity": product["quantity"],
                        "unit": product["unit"],
                    }
                )
    except OSError as error:
        raise HTTPException(status_code=500, detail="Unable to write inventory file") from error


def _find_product(products: List[ProductRow], product_id: int) -> Optional[ProductRow]:
    for product in products:
        if product["product_id"] == product_id:
            return product
    return None


def create_product(name: str, quantity: int, unit: str) -> ProductRow:
    products = load_products()
    next_id = max((int(product["product_id"]) for product in products), default=0) + 1
    product: ProductRow = {
        "product_id": next_id,
        "name": name.strip(),
        "quantity": quantity,
        "unit": unit.strip(),
    }
    products.append(product)
    save_products(products)
    return product


def apply_delta(product_id: int, delta: int) -> ProductRow:
    products = load_products()
    product = _find_product(products, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    new_quantity = int(product["quantity"]) + delta
    if new_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "Insufficient stock: cannot reduce below 0 "
                f"(current: {product['quantity']}, delta: {delta})"
            ),
        )

    product["quantity"] = new_quantity
    save_products(products)
    return product


def get_alerts(threshold: int = 10) -> List[ProductRow]:
    if threshold < 0:
        raise HTTPException(status_code=400, detail="Threshold must be greater than or equal to 0")
    return [product for product in load_products() if int(product["quantity"]) < threshold]


@router.get("")
def list_inventory() -> List[ProductRow]:
    return load_products()


@router.post("", status_code=201)
def add_product(body: ProductCreate) -> ProductRow:
    return create_product(body.name, body.quantity, body.unit)


@router.get("/alerts")
def low_stock_alerts(threshold: int = 10) -> List[ProductRow]:
    return get_alerts(threshold)


@router.patch("/{product_id}")
def update_stock(product_id: int, body: StockDelta) -> ProductRow:
    return apply_delta(product_id, body.delta)
