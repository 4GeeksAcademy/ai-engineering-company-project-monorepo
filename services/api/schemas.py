from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class OrderType(str, Enum):
    INBOUND = "INBOUND"
    OUTBOUND = "OUTBOUND"

class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    price: float = Field(..., gt=0)

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    product_id: str
    current_stock: int = 0

    class Config:
        from_attributes = True

class OrderItemBase(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemResponse(OrderItemBase):
    pass

class OrderBase(BaseModel):
    type: OrderType
    items: List[OrderItemCreate]

class OrderCreate(OrderBase):
    pass

class InboundOrderCreate(OrderBase):
    type: OrderType = OrderType.INBOUND

class OutboundOrderCreate(OrderBase):
    type: OrderType = OrderType.OUTBOUND

class OrderResponse(BaseModel):
    id: str
    type: OrderType
    created_by: str
    created_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True

class ProductStockResponse(BaseModel):
    product_id: str
    sku: str
    name: str
    current_stock: int
