from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from services.api.database import get_db
from services.api.models import Ingredient, IngredientEntry, IngredientExit
from services.api.schemas import (
    IngredientCreate,
    IngredientEntryCreate,
    IngredientEntryResponse,
    IngredientExitCreate,
    IngredientExitResponse,
    IngredientOrderResponse,
    IngredientResponse,
)


router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
)


def calculate_stock(
    ingredient_id: int,
    db: Session,
) -> float:
    inbound = db.exec(
        select(func.coalesce(func.sum(IngredientEntry.quantity), 0.0))
        .where(IngredientEntry.ingredient_id == ingredient_id)
    ).one()

    outbound = db.exec(
        select(func.coalesce(func.sum(IngredientExit.quantity), 0.0))
        .where(IngredientExit.ingredient_id == ingredient_id)
    ).one()

    return float(inbound) - float(outbound)


@router.get(
    "/products",
    response_model=list[IngredientResponse],
)
def get_products(
    db: Session = Depends(get_db),
):
    ingredients = db.exec(
        select(Ingredient)
    ).all()

    return [
        IngredientResponse(
            id=ingredient.id,
            name=ingredient.name,
            sku=ingredient.sku,
            unit=ingredient.unit,
            category=ingredient.category,
            country=ingredient.country,
            current_stock=calculate_stock(
                ingredient.id,
                db,
            ),
        )
        for ingredient in ingredients
    ]


@router.post(
    "/products",
    response_model=IngredientResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    ingredient_data: IngredientCreate,
    db: Session = Depends(get_db),
):
    existing = db.exec(
        select(Ingredient).where(
            Ingredient.sku == ingredient_data.sku
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Ingredient with SKU '{ingredient_data.sku}' already exists.",
        )

    ingredient = Ingredient(
        name=ingredient_data.name,
        sku=ingredient_data.sku,
        unit=ingredient_data.unit,
        category=ingredient_data.category,
        country=ingredient_data.country,
    )

    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)

    return IngredientResponse(
        id=ingredient.id,
        name=ingredient.name,
        sku=ingredient.sku,
        unit=ingredient.unit,
        category=ingredient.category,
        country=ingredient.country,
        current_stock=0.0,
    )


@router.get(
    "/products/{id}",
    response_model=IngredientResponse,
)
def get_product(
    id: int,
    db: Session = Depends(get_db),
):
    ingredient = db.get(
        Ingredient,
        id,
    )

    if not ingredient:
        raise HTTPException(
            status_code=404,
            detail="Ingredient not found.",
        )

    return IngredientResponse(
        id=ingredient.id,
        name=ingredient.name,
        sku=ingredient.sku,
        unit=ingredient.unit,
        category=ingredient.category,
        country=ingredient.country,
        current_stock=calculate_stock(
            ingredient.id,
            db,
        ),
    )


@router.post(
    "/orders/inbound",
    response_model=IngredientEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inbound_order(
    entry_data: IngredientEntryCreate,
    db: Session = Depends(get_db),
):
    ingredient = db.get(
        Ingredient,
        entry_data.ingredient_id,
    )

    if not ingredient:
        raise HTTPException(
            status_code=404,
            detail="Ingredient not found.",
        )

    entry = IngredientEntry(
        ingredient_id=entry_data.ingredient_id,
        quantity=entry_data.quantity,
        supplier_name=entry_data.supplier_name,
        location_id=entry_data.location_id,
        user_uuid=entry_data.user_uuid,
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


@router.post(
    "/orders/outbound",
    response_model=IngredientExitResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_outbound_order(
    exit_data: IngredientExitCreate,
    db: Session = Depends(get_db),
):
    ingredient = db.get(
        Ingredient,
        exit_data.ingredient_id,
    )

    if not ingredient:
        raise HTTPException(
            status_code=404,
            detail="Ingredient not found.",
        )

    if exit_data.reason not in {"consumption", "waste"}:
        raise HTTPException(
            status_code=422,
            detail="Reason must be 'consumption' or 'waste'.",
        )

    available = calculate_stock(
        ingredient.id,
        db,
    )

    if exit_data.quantity > available:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient stock for ingredient "
                f"'{ingredient.name}'. "
                f"Available: {available}, "
                f"requested: {exit_data.quantity}."
            ),
        )

    exit_record = IngredientExit(
        ingredient_id=exit_data.ingredient_id,
        quantity=exit_data.quantity,
        reason=exit_data.reason,
        location_id=exit_data.location_id,
        user_uuid=exit_data.user_uuid,
    )

    db.add(exit_record)
    db.commit()
    db.refresh(exit_record)

    return exit_record


@router.get(
    "/orders",
    response_model=list[IngredientOrderResponse],
)
def get_orders(
    db: Session = Depends(get_db),
):
    inbound_entries = db.exec(
        select(
            IngredientEntry,
            Ingredient,
        )
        .join(
            Ingredient,
            Ingredient.id == IngredientEntry.ingredient_id,
        )
    ).all()

    outbound_exits = db.exec(
        select(
            IngredientExit,
            Ingredient,
        )
        .join(
            Ingredient,
            Ingredient.id == IngredientExit.ingredient_id,
        )
    ).all()

    orders = []

    for entry, ingredient in inbound_entries:
        orders.append(
            IngredientOrderResponse(
                id=entry.id,
                ingredient_id=entry.ingredient_id,
                ingredient_name=ingredient.name,
                type="inbound",
                quantity=entry.quantity,
                supplier_name=entry.supplier_name,
                reason=None,
                location_id=entry.location_id,
                created_at=entry.created_at,
                user_uuid=entry.user_uuid,
            )
        )

    for exit_record, ingredient in outbound_exits:
        orders.append(
            IngredientOrderResponse(
                id=exit_record.id,
                ingredient_id=exit_record.ingredient_id,
                ingredient_name=ingredient.name,
                type="outbound",
                quantity=exit_record.quantity,
                supplier_name=None,
                reason=exit_record.reason,
                location_id=exit_record.location_id,
                created_at=exit_record.created_at,
                user_uuid=exit_record.user_uuid,
            )
        )

    orders.sort(
        key=lambda order: order.created_at,
        reverse=True,
    )

    return orders