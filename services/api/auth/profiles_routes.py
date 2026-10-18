from fastapi import APIRouter, Depends, HTTPException

from .dependencies import get_current_user
from .models import ProfileCreate, ProfilePublic
from .profiles import create_profile, get_profile_by_user_id, update_profile


router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfilePublic)
def get_my_profile(current_user=Depends(get_current_user)):
    profile = get_profile_by_user_id(current_user["id"])

    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")

    return profile


@router.put("/me", response_model=ProfilePublic)
def update_my_profile(
    profile_data: ProfileCreate,
    current_user=Depends(get_current_user),
):
    profile = get_profile_by_user_id(current_user["id"])

    if not profile:
        return create_profile(
            user_id=current_user["id"],
            name=profile_data.name,
            phone=profile_data.phone,
            address=profile_data.address,
        )

    updated = update_profile(
        current_user["id"],
        profile_data.model_dump(),
    )

    return updated
