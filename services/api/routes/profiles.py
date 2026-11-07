"""Profile endpoints: each user reads and edits only their own profile."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

import user_service
from dependencies import CurrentUser, UserRepo
from user_models import Profile, ProfilePublic, ProfileUpdate

router = APIRouter(prefix="/profiles", tags=["profiles"])

UNAUTHORIZED = {401: {"description": "Missing, malformed or expired token"}}


@router.get("/me", response_model=ProfilePublic, responses={**UNAUTHORIZED, 404: {"description": "Profile not found"}})
def get_my_profile(current: CurrentUser, repository: UserRepo) -> Profile:
    profile = user_service.get_profile(repository, current.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/me", response_model=ProfilePublic, responses=UNAUTHORIZED)
def update_my_profile(payload: ProfileUpdate, current: CurrentUser, repository: UserRepo) -> Profile:
    return user_service.update_profile(repository, current.id, payload)
