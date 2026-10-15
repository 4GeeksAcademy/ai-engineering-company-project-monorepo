from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from services.api.auth import storage
from services.api.auth.models import Profile, Role
from services.api.auth.security import (
    create_access_token,
    get_current_user,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class CurrentUserResponse(BaseModel):
    email: str
    role: Role
    profile: Profile | None


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = storage.get_user_by_email(form.username)

    if (
        not user
        or not verify_password(form.password, user["hashed_password"])
        or not user["is_active"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user["id"])

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=CurrentUserResponse)
def get_me(current_user=Depends(get_current_user)):
    profile = storage.get_profile_by_user_id(current_user["id"])

    return {
        "email": current_user["email"],
        "role": current_user["role"],
        "profile": profile,
    }
