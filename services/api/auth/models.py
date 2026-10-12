from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserPublic(BaseModel):
    id: int
    email: str
    is_active: bool
    role: str
    created_at: str


class ProfileCreate(BaseModel):
    name: str
    phone: str | None = None
    address: str | None = None


class ProfilePublic(BaseModel):
    id: int
    user_id: int
    name: str
    phone: str | None = None
    address: str | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8)
    is_active: bool | None = None
    role: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
