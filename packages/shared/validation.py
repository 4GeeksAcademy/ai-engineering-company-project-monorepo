from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import uuid
from typing import Optional

class IncidentStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    discarded = "discarded"

class IncidentOrigin(str, Enum):
    customer = "customer"
    branch = "branch"
    internal = "internal"

class IncidentBranch(str, Enum):
    valencia = "valencia"
    miami = "miami"
    central = "central"

class IncidentCategory(str, Enum):
    fallo_operativo = "fallo_operativo"
    queja = "queja"
    solicitud = "solicitud"

class IncidentBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=150, description="Título breve de la incidencia")
    description: str = Field(..., min_length=20, max_length=1000, description="Descripción detallada")
    category: IncidentCategory
    status: IncidentStatus = IncidentStatus.open
    origin: IncidentOrigin
    branch: IncidentBranch

class IncidentCreate(IncidentBase):
    pass

class IncidentUpdateStatus(BaseModel):
    status: IncidentStatus

class IncidentInDB(IncidentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class IncidentResponse(IncidentInDB):
    pass
