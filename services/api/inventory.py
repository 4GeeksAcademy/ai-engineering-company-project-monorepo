from __future__ import annotations

"""Inventory routes for the company FastAPI app.

Canonical CSV store and FastAPI inventory application: api.inventory
"""

from api.inventory import (  # noqa: F401
    FIELDNAMES,
    LOCATIONS,
    PRODUCTS_FILE,
    Product,
    ProductCreate,
    StockDelta,
    apply_delta,
    create_product,
    get_alerts,
    load_products,
    register_error_handlers,
    router,
    save_products,
)
