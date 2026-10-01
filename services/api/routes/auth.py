"""Login and current-identity endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status

import database
from auth.dependencies import get_current_user
from auth.security import create_access_token, verify_password
from models_auth import AuthMeResponse, LoginRequest, TokenResponse
from models_auth import ProfileResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = database.get_user_by_email(str(payload.email).strip().lower())
    if user is None or not user.get("is_active") or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(access_token=create_access_token(int(user["id"])))


@router.get("/me", response_model=AuthMeResponse)
def get_me(current_user: dict = Depends(get_current_user)) -> AuthMeResponse:
    profile = database.get_profile_by_user_id(int(current_user["id"]))
    return AuthMeResponse.model_validate(
        {**current_user, "profile": ProfileResponse.model_validate(profile) if profile is not None else None}
    )
