"""Authentication endpoints for JWT login and current-user inspection."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.models.profile import Profile
from src.models.user import User
from src.services.auth_service import create_access_token, get_current_user
from src.services.profile_service import get_profile_by_user_id
from src.services.security import verify_password
from src.services.user_service import get_user_by_email

auth_router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    email: str
    role: str
    profile: Profile | None


@auth_router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = get_user_by_email(payload.email)
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@auth_router.get("/me", response_model=MeResponse)
def get_me(current_user: User = Depends(get_current_user)) -> MeResponse:
    profile = get_profile_by_user_id(current_user.id)
    return MeResponse(
        email=current_user.email,
        role=current_user.role.value,
        profile=profile,
    )
