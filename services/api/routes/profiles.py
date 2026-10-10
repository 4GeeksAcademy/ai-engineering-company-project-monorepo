from fastapi import APIRouter, HTTPException, status, Depends
from tinydb import Query
from services.api.models import ProfileResponse, ProfileUpdate
from services.api.database import get_tinydb
from services.api.routes.auth import get_current_user

router = APIRouter(prefix="/profiles", tags=["Profiles"])


@router.get("/me", response_model=ProfileResponse)
def get_profile(current_user: dict = Depends(get_current_user)):
    db = get_tinydb()
    ProfileQuery = Query()
    prof = db.table('profiles').search(ProfileQuery.user_id == current_user['id'])
    
    if not prof:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return prof[0]


@router.put("/me", response_model=ProfileResponse)
def update_profile(profile_update: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    db = get_tinydb()
    ProfileQuery = Query()
    prof = db.table('profiles').search(ProfileQuery.user_id == current_user['id'])
    
    if not prof:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")

    updated_data = profile_update.dict(exclude_unset=True)
    db.table('profiles').update(updated_data, ProfileQuery.user_id == current_user['id'])

    updated_prof = db.table('profiles').search(ProfileQuery.user_id == current_user['id'])
    return updated_prof[0]