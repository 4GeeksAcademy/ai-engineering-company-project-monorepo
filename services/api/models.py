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
    profile: Optional[Profile] = None

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


from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
import datetime

class Asset(SQLModel, table=True):
    __tablename__='assets'

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    sku: str = Field(unique=True, index=True)
    department: str = Field(index=True)

    # Relaciones para navegar fácilmente entre tablas
    acquisitions: List['AssetAcquisition']= Relationship(back_populates='asset')
    assignments: List['AssetAssignment']= Relationship(back_populates='asset')

class AssetAcquisition(SQLModel, table=True):
    __tablename__='asset_acquisitions'

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_id: int= Field(foreign_key='assets.id')
    quantity: int= Field(gt=0)
    created_at: datetime.datetime= Field(default_factory=datetime.datetime.utcnow)

    user_uuid: str= Field(index=True)
    asset:Optional[Asset]= Relationship(back_populates='acquisitions')

class AssetAssignment(SQLModel, table=True):
    __tablename__='asset_assignments'

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_id: int= Field(foreign_key='assets.id')
    quantity: int= Field(gt=0)
    created_at: datetime.datetime= Field(default_factory=datetime.datetime.utcnow)

    user_uuid: str= Field(index=True)
    asset:Optional[Asset]= Relationship(back_populates='assignments')


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