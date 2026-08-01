"""Profile endpoints for authenticated users."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.models.profile import Profile
from src.models.user import User
from src.services.auth_service import get_current_user
from src.services.profile_service import get_profile_by_user_id, update_profile

profiles_router = APIRouter(prefix="/profiles", tags=["profiles"])


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    address: str | None = None


@profiles_router.get("/me", response_model=Profile)
def get_my_profile(current_user: User = Depends(get_current_user)) -> Profile:
    profile = get_profile_by_user_id(current_user.id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    return profile


@profiles_router.put("/me", response_model=Profile)
def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> Profile:
    updates = payload.model_dump(exclude_none=True)
    profile = update_profile(current_user.id, updates)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    return profile
