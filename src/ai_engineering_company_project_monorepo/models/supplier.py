from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class SupplierStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class SupplierBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    country: str
    product_categories: list[str]
    rate: Decimal = Field(gt=0)
    status: SupplierStatus


class SupplierCreate(SupplierBase):
    pass


class SupplierResponse(SupplierBase):
    updated_at: datetime


Supplier = SupplierResponse