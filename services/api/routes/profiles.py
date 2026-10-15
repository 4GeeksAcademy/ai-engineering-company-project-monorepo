from fastapi import APIRouter, Depends, HTTPException

from services.api.auth import storage
from services.api.auth.models import Profile, ProfileUpdate
from services.api.auth.security import get_current_user

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=Profile)
def get_my_profile(current_user=Depends(get_current_user)):
    profile = storage.get_profile_by_user_id(current_user["id"])

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Perfil no encontrado",
        )

    return profile


@router.put("/me", response_model=Profile)
def update_my_profile(
    payload: ProfileUpdate,
    current_user=Depends(get_current_user),
):
    changes = payload.model_dump(exclude_unset=True)

    profile = storage.update_profile(
        current_user["id"],
        changes,
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Perfil no encontrado",
        )

    return profile
