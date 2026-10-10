from pydantic import BaseModel, Field
from typing import Optional,List, Any, Dict
from datetime import datetime

# SCHEMAS PARA ACTIVOS (ASSETS)
class AssetBase(BaseModel):
    name: str = Field(...,min_length=1)
    sku: str = Field(..., min_length=1)
    department: str= Field(...,min_length=1)

class AssetCreate(AssetBase):
    pass

class AssetRead(AssetBase):
    id: int
    current_stock: int

# SCHEMAS PARA ENTRADAS (ACQUISITIONS)
class AssetAcquisitionCreate(BaseModel):
    asset_id: int
    quantity: int = Field(..., gt=0, description="La cantidad debe ser mayor a cero")

class AssetAcquisitionRead(BaseModel):
    id: int
    asset_id: int
    quantity: int
    created_at: datetime
    user_uuid: str

# SCHEMAS PARA SALIDAS (ASSIGNMENTS)
class AssetAssignmentCreate(BaseModel):
    asset_id: int
    quantity: int = Field(..., gt=0, description="La cantidad debe ser mayor a cero")

class AssetAssignmentRead(BaseModel):
    id: int
    asset_id: int
    quantity: int
    created_at: datetime
    user_uuid: str

class OrdersAuditResponse(BaseModel):
    inbound: List[AssetAcquisitionRead]
    outbound: List[AssetAssignmentRead]

# SCHEMAS PARA TELEMETRÍA
class TelemetryEvent(BaseModel):
    eventId: str
    timestamp: str
    sessionId: Optional[str] = None
    userId: Optional[str] = None 
    event_type: str
    schemaVersion: str
    requestId: str
    properties: Dict[str, Any]

class TelemetryBatch(BaseModel):
    events: List[TelemetryEvent]
