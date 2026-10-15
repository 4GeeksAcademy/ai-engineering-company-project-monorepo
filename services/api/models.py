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

class UserRole(str,Enum):
    admin = "admin"
    manager = "manager"
    user = "user"

class ProfileBase(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str]= None

class Profile(ProfileBase):
    id: str
    user_id: str

class ProfileResponse(ProfileBase):
    id: str

class ProfileUpdate(ProfileBase):
    pass

class UserBase(BaseModel):
    email: str
    is_active: bool = True
    role: UserRole = UserRole.user

class UserCreate(UserBase):
    password: str
    profile: Optional[ProfileBase] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime
    profile: Optional[ProfileResponse] = None

class UserListItem(BaseModel):
    id: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

class UserInDB(UserBase):
    id: str
    hashed_password: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    
class TokenData(BaseModel):
    user_id: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class MessageResponse(BaseModel):
    message: str

# pyrefly: ignore [missing-import]
from sqlmodel import SQLModel, Field
from typing import Optional, List, Dict
import datetime

class IncidentSummaryResponse(BaseModel):
    status: Dict[str, int]
    category: Dict[str, int]
    origin: Dict[str, int]
    branch: Dict[str, int]

class IncidentMetrics(BaseModel):
    total_procesados: int
    total_validos: int
    total_invalidos: int
    conteo_categorias: Dict[str, int]
    conteo_estados: Dict[str, int]
    satisfaccion_media: float

class IncidentAnalysisResponse(BaseModel):
    success: bool
    metrics: IncidentMetrics
    errores_encontrados: int

class AssetAcquisition(SQLModel, table=True):
    __tablename__='asset_acquisitions'
    __table_args__ = {'extend_existing': True}

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_id: int= Field(foreign_key='assets.id')
    quantity: int= Field(gt=0)
    created_at: datetime.datetime= Field(default_factory=datetime.datetime.utcnow)
    user_uuid: str= Field(index=True)

class AssetAssignment(SQLModel, table=True):
    __tablename__='asset_assignments'
    __table_args__ = {'extend_existing': True}

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_id: int= Field(foreign_key='assets.id')
    quantity: int= Field(gt=0)
    created_at: datetime.datetime= Field(default_factory=datetime.datetime.utcnow)
    user_uuid: str= Field(index=True)

class Asset(SQLModel, table=True):
    __tablename__='assets'
    __table_args__ = {'extend_existing': True}

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    sku: str = Field(unique=True, index=True)
    department: str = Field(index=True)


# --- Modelos de Candidatos (Scoring / Tracker) ---

class CandidateBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    position: str
    linkedin: Optional[str] = None
    resume_url: Optional[str] = None
    years_of_experience: Optional[int] = 0
    status: str = "PENDING"
    stage: str = "SCREENING"
    score_ia: Optional[float] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    linkedin: Optional[str] = None
    resume_url: Optional[str] = None
    years_of_experience: Optional[int] = None
    status: Optional[str] = None
    stage: Optional[str] = None
    score_ia: Optional[float] = None

class CandidatePatch(CandidateUpdate):
    pass

class CandidateResponse(CandidateBase):
    id: int
    applied_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class CandidateNoteBase(BaseModel):
    content: str

class CandidateNoteCreate(CandidateNoteBase):
    pass

class CandidateNoteResponse(CandidateNoteBase):
    id: int
    candidate_id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# --- Modelos de Dominio para Reporting y Business Performance ---
from sqlmodel import SQLModel, Field
import uuid

class ExecutiveKpiDB(SQLModel, table=True):
    __tablename__ = "reporting_executive_kpis"
    __table_args__ = {"extend_existing": True}

    kpi_id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    window_date: str = Field(nullable=False, index=True)
    window_granularity: str = Field(default="daily", nullable=False)
    department: str = Field(nullable=False, index=True)
    metric_name: str = Field(nullable=False, index=True)
    metric_value: float = Field(nullable=False)
    target_value: float = Field(nullable=False)
    sla_status: str = Field(nullable=False)
    calculated_at: str = Field(nullable=False)
    run_id: str = Field(nullable=False)


class PipelineRunDB(SQLModel, table=True):
    __tablename__ = "reporting_pipeline_runs"
    __table_args__ = {"extend_existing": True}

    run_id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    flow_name: str = Field(nullable=False)
    started_at: str = Field(nullable=False)
    finished_at: Optional[str] = Field(default=None, nullable=True)
    status: str = Field(nullable=False)
    records_processed: int = Field(default=0, nullable=False)
    error_message: Optional[str] = Field(default=None, nullable=True)