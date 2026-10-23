from datetime import datetime

from pydantic import BaseModel, Field


class IngredientCreate(BaseModel):
    name: str
    sku: str
    unit: str
    category: str
    country: str


class IngredientResponse(BaseModel):
    id: int
    name: str
    sku: str
    unit: str
    category: str
    country: str
    current_stock: float


class IngredientEntryCreate(BaseModel):
    ingredient_id: int
    quantity: float = Field(gt=0)
    supplier_name: str
    location_id: int = Field(ge=1, le=14)
    user_uuid: str


class IngredientEntryResponse(BaseModel):
    id: int
    ingredient_id: int
    quantity: float
    supplier_name: str
    location_id: int
    created_at: datetime
    user_uuid: str


class IngredientExitCreate(BaseModel):
    ingredient_id: int
    quantity: float = Field(gt=0)
    reason: str
    location_id: int = Field(ge=1, le=14)
    user_uuid: str


class IngredientExitResponse(BaseModel):
    id: int
    ingredient_id: int
    quantity: float
    reason: str
    location_id: int
    created_at: datetime
    user_uuid: str


class IngredientOrderResponse(BaseModel):
    id: int
    ingredient_id: int
    ingredient_name: str
    type: str
    quantity: float
    supplier_name: str | None = None
    reason: str | None = None
    location_id: int
    created_at: datetime
    user_uuid: str