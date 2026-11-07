"""Pydantic request/response schemas of the inventory API.

Order responses flatten the asset to asset_id, asset_name and asset_sku (all the orders table reads).
Independent classes: none inherits from the SQLModel tables (inventory_models.py)
and no endpoint returns a table object. `current_stock` exists only here, computed
from the orders; it is not a column and no request schema accepts it.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class Office(StrEnum):
    VALENCIA = "Valencia"
    MIAMI = "Miami"


class AssetCategory(StrEnum):
    HARDWARE = "hardware"
    PERIPHERALS = "peripherals"
    OFFICE_SUPPLIES = "office_supplies"
    TRAINING_MATERIALS = "training_materials"


class ExitType(StrEnum):
    ALLOCATION = "allocation"
    CONSUMPTION = "consumption"


# --- Assets ---------------------------------------------------------------------------------------


class AssetCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Text
    sku: Text
    category: AssetCategory
    office: Office


class AssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    category: AssetCategory
    office: Office
    current_stock: int


# --- Orders ---------------------------------------------------------------------------------------


class AssetEntryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: int
    quantity: int = Field(gt=0, description="Units received (greater than 0)")
    supplier: Text
    office: Office


class AssetExitCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: int
    quantity: int = Field(gt=0, description="Units assigned or consumed (greater than 0)")
    exit_type: ExitType
    assigned_to: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] | None = None
    office: Office

    @model_validator(mode="after")
    def check_assigned_to(self) -> AssetExitCreate:
        if self.exit_type is ExitType.ALLOCATION and not self.assigned_to:
            raise ValueError("assigned_to is required when exit_type is 'allocation'")
        if self.exit_type is ExitType.CONSUMPTION and self.assigned_to is not None:
            raise ValueError("assigned_to must be null when exit_type is 'consumption'")
        return self


class AssetEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_type: Literal["inbound"] = "inbound"
    id: int
    asset_id: int
    asset_name: str
    asset_sku: str
    quantity: int
    supplier: str
    office: Office
    created_at: datetime
    user_uuid: str


class AssetExitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_type: Literal["outbound"] = "outbound"
    id: int
    asset_id: int
    asset_name: str
    asset_sku: str
    quantity: int
    exit_type: ExitType
    assigned_to: str | None
    office: Office
    created_at: datetime
    user_uuid: str


OrderResponse = Annotated[AssetEntryResponse | AssetExitResponse, Field(discriminator="order_type")]
