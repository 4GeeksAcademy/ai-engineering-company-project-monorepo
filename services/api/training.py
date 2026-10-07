"""Recipe publish and location acknowledgement.

Recipes are the chain menu. Publishing bumps the version. A location can
acknowledge only a version that has been published.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from users import get_current_user

from domain_facts import timezone_for
from locations import get_location
from menus import list_menu_items

router = APIRouter(
    prefix="/training",
    tags=["training"],
    dependencies=[Depends(get_current_user)],
)

Locale = Literal["es", "en"]


class Recipe(BaseModel):
    recipe_id: str
    version: int = Field(ge=1)
    title_es: str
    title_en: str


class PublishCreate(BaseModel):
    locale: Locale


class AcknowledgeCreate(BaseModel):
    location_id: str = Field(min_length=1, max_length=64)
    version: int = Field(ge=1)


class CaptureResult(BaseModel):
    capture: dict


def _recipe_id(menu_id: str) -> str:
    return "rec_" + menu_id.replace("-", "_")


def _seed() -> list[Recipe]:
    return [
        Recipe(
            recipe_id=_recipe_id(item.id),
            version=1,
            title_es=item.name_es,
            title_en=item.name,
        )
        for item in list_menu_items()
    ]


_RECIPES: list[Recipe] = _seed()


def _recipe(recipe_id: str) -> Recipe:
    for row in _RECIPES:
        if row.recipe_id == recipe_id:
            return row
    raise HTTPException(status_code=404, detail="That recipe was not found.")


@router.get("/recipes", response_model=list[Recipe])
def list_recipes() -> list[Recipe]:
    return list(_RECIPES)


@router.post("/recipes/{recipe_id}/publish", response_model=CaptureResult, status_code=201)
def publish_recipe(recipe_id: str, payload: PublishCreate) -> CaptureResult:
    row = _recipe(recipe_id)
    row.version += 1
    title = row.title_es if payload.locale == "es" else row.title_en
    return CaptureResult(
        capture={
            "location_scope": "none",
            "recipe_id": row.recipe_id,
            "version": row.version,
            "locale": payload.locale,
            "title": title,
        }
    )


@router.post("/recipes/{recipe_id}/acknowledgements", response_model=CaptureResult, status_code=201)
def acknowledge_recipe(recipe_id: str, payload: AcknowledgeCreate) -> CaptureResult:
    row = _recipe(recipe_id)
    if payload.version != row.version:
        raise HTTPException(status_code=409, detail="Acknowledge the version that is published now.")
    location = get_location(payload.location_id.strip())
    if location is None:
        raise HTTPException(status_code=404, detail="That location was not found.")
    return CaptureResult(
        capture={
            "location_scope": "location",
            "location_id": location.id,
            "country": location.country,
            "currency": location.currency,
            "timezone": timezone_for(location.country),
            "recipe_id": row.recipe_id,
            "version": row.version,
        }
    )
