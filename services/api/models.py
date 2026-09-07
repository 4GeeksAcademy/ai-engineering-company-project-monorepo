from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class SupplierStatus(str, Enum):
    active = "active"
    suspended = "suspended"

class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1)
    country: str = Field(..., min_length=1)
    categories: List[str] = Field(..., min_items=1)
    hourly_rate: float = Field(..., gt=0)
    status: SupplierStatus

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    updated_at: datetime

class SupplierUpdateRate(BaseModel):
    hourly_rate: float = Field(..., gt=0)

class SupplierUpdateStatus(BaseModel):
    status: SupplierStatus
