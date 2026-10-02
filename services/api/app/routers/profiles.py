"""Profiles router — the authenticated user's own profile.

GET  /profiles/me   return the authenticated user's profile  (protected)
PUT  /profiles/me   update name, phone and address; only the profile
                    owner may update it                      (protected)
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user
from app.models.profile import ProfileUpdate
from app.models.schemas import ApiResponse
from app.services import profiles as profiles_service

router = APIRouter(prefix="/profiles", tags=["profiles"])


# ── GET /profiles/me ──────────────────────────────────────
@router.get("/me", response_model=ApiResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile.

    The profile is resolved from the JWT subject (user id) — the caller
    can only ever see their own profile.
    """
    profile = profiles_service.get_profile_by_user_id(current_user["id"])
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ApiResponse(data=profile)


# ── PUT /profiles/me ──────────────────────────────────────
@router.put("/me", response_model=ApiResponse)
async def update_my_profile(
    payload: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update name, phone and address of the authenticated user's profile.

    Ownership is enforced by resolving the target profile from the JWT
    subject — there is no way to address another user's profile here.
    """
    updated = profiles_service.update_profile(current_user["id"], payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ApiResponse(message="Profile updated successfully", data=updated)