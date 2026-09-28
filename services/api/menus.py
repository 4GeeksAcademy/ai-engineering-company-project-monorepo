"""Brasaland menus API — Technology / Training domain from CONTEXT.md.

Jake Morrison needs the same recipes and presentation in every kitchen.
This catalogue is the chain menu (Medellín and Miami), with list prices in COP and USD.
Public read: the menu is not staff-only. Sales, customers, and suppliers require JWT.
"""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/menus", tags=["menus"])

Allergen = Literal["soy", "peanuts", "nuts", "dairy", "egg", "gluten", "sulfites"]
Market = Literal["Colombia", "Florida"]


class MenuItem(BaseModel):
    id: str
    name: str
    name_es: str
    category: Literal["main", "side", "sauce"]
    description: str
    allergens: list[Allergen] = Field(default_factory=list)
    gluten_free: bool
    dairy_free: bool
    price_cop: int = Field(ge=0, description="Illustrative COP list price (not a live POS feed)")
    price_usd: float = Field(ge=0, description="Illustrative USD list price (not a live POS feed)")
    available_in: list[Market]


class MenuCatalogue(BaseModel):
    company: str = "Brasaland"
    location_count: int = 14
    same_recipes_every_kitchen: bool = True
    currencies: list[Literal["COP", "USD"]]
    source: str = (
        "CONTEXT.md Training — same recipes in all 14 kitchens; "
        "docs/company-knowledge-base/brasaland-menu-allergens.en.md"
    )
    items: list[MenuItem]


_ITEMS: list[MenuItem] = [
    MenuItem(
        id="grilled-sirloin",
        name="Grilled Sirloin",
        name_es="Lomo a la Brasa",
        category="main",
        description="House marinade. Same plate in Medellín and Miami.",
        allergens=["soy"],
        gluten_free=True,
        dairy_free=True,
        price_cop=48000,
        price_usd=18.0,
        available_in=["Colombia", "Florida"],
    ),
    MenuItem(
        id="bbq-ribs",
        name="Brasaland BBQ Ribs",
        name_es="Costillas BBQ Brasaland",
        category="main",
        description="Imported sauce; not certified gluten-free.",
        allergens=["soy", "peanuts"],
        gluten_free=False,
        dairy_free=True,
        price_cop=52000,
        price_usd=20.0,
        available_in=["Colombia", "Florida"],
    ),
    MenuItem(
        id="grilled-chicken",
        name="Classic Grilled Chicken",
        name_es="Pollo a la Brasa",
        category="main",
        description="Gluten-free, dairy-free, nut-free.",
        allergens=[],
        gluten_free=True,
        dairy_free=True,
        price_cop=32000,
        price_usd=12.0,
        available_in=["Colombia", "Florida"],
    ),
    MenuItem(
        id="tropical-salad",
        name="Tropical Salad",
        name_es="Ensalada Tropical",
        category="main",
        description="Cashew and feta.",
        allergens=["nuts", "dairy"],
        gluten_free=True,
        dairy_free=False,
        price_cop=28000,
        price_usd=11.0,
        available_in=["Colombia", "Florida"],
    ),
    MenuItem(
        id="corn-arepa",
        name="Corn Arepa",
        name_es="Arepa de maíz",
        category="side",
        description="Side served in both markets.",
        allergens=["dairy", "egg"],
        gluten_free=True,
        dairy_free=False,
        price_cop=8000,
        price_usd=4.0,
        available_in=["Colombia", "Florida"],
    ),
    MenuItem(
        id="house-sauce",
        name="House Sauce",
        name_es="Salsa de la casa",
        category="sauce",
        description="Contains soy and sulfites.",
        allergens=["soy", "sulfites"],
        gluten_free=True,
        dairy_free=True,
        price_cop=4000,
        price_usd=2.0,
        available_in=["Colombia", "Florida"],
    ),
]


def menu_item_ids() -> set[str]:
    return {item.id for item in _ITEMS}


def _catalogue() -> MenuCatalogue:
    return MenuCatalogue(currencies=["COP", "USD"], items=list(_ITEMS))


@router.get("", response_model=list[MenuItem])
def list_menu_items() -> list[MenuItem]:
    """Chain menu. Same dishes in Colombia and Florida, priced in COP and USD."""
    return list(_ITEMS)


@router.get("/catalogue", response_model=MenuCatalogue)
def menu_catalogue() -> MenuCatalogue:
    return _catalogue()


@router.get("/{item_id}", response_model=MenuItem)
def get_menu_item(item_id: str) -> MenuItem:
    for item in _ITEMS:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Menu item was not found.")
