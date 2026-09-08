from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum
from packages.shared.validation import (
    IncidentStatus, IncidentOrigin, IncidentBranch, IncidentCategory,
    IncidentBase, IncidentCreate, IncidentUpdateStatus, IncidentInDB, IncidentResponse
)

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

# --- CANDIDATES MODELS ---
class CandidateStatus(str, Enum):
    PENDING = "PENDING"
    IN_REVIEW = "IN_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

class CandidateStage(str, Enum):
    SCREENING = "SCREENING"
    INTERVIEW = "INTERVIEW"
    TECHNICAL_TEST = "TECHNICAL_TEST"
    OFFER = "OFFER"
    HIRED = "HIRED"

class CandidateNoteBase(BaseModel):
    content: str = Field(..., min_length=1)

class CandidateNoteCreate(CandidateNoteBase):
    pass

class CandidateNoteResponse(CandidateNoteBase):
    id: int
    candidate_id: int
    created_at: datetime
    updated_at: datetime

class CandidateBase(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    phone: Optional[str] = None
    position: str = Field(..., min_length=1)
    linkedin: Optional[str] = None
    resume_url: Optional[str] = None
    years_of_experience: Optional[int] = None
    status: CandidateStatus = CandidateStatus.PENDING
    stage: CandidateStage = CandidateStage.SCREENING
    score_ia: Optional[int] = Field(None, ge=0, le=100)

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
    status: Optional[CandidateStatus] = None
    stage: Optional[CandidateStage] = None

class CandidatePatch(BaseModel):
    status: Optional[CandidateStatus] = None
    stage: Optional[CandidateStage] = None

class CandidateResponse(CandidateBase):
    id: int
    applied_at: datetime
    created_at: datetime
    updated_at: datetime
    notes: Optional[List[CandidateNoteResponse]] = None
