from fastapi import APIRouter, Depends, HTTPException, Request

from models import Profile, ProfileUpdate, User
from security import get_current_user
from user_service import get_profile_by_user_id, update_profile


router = APIRouter(prefix="/profiles", tags=["profiles"], dependencies=[Depends(get_current_user)])


@router.get("/me", response_model=Profile)
def get_my_profile(request: Request, current_user: User = Depends(get_current_user)):
    with request.app.state.lock:
        profile = get_profile_by_user_id(request.app.state.db, current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Perfil no encontrado.")
    return profile


@router.put("/me", response_model=Profile)
def update_my_profile(
    payload: ProfileUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Indica al menos un campo para actualizar.")
    profile = update_profile(request.app.state.db, request.app.state.lock, current_user.id, changes)
    if profile is None:
        raise HTTPException(status_code=404, detail="Perfil no encontrado.")
    return profile