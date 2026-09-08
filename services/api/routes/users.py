from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime
from tinydb import Query
from services.api.models import UserCreate, UserResponse
from services.api.database import get_user_by_email, get_user_by_id, create_user_in_db, get_db
from passlib.hash import bcrypt
from fastapi import Depends
from services.api.routes.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user:UserCreate):
    existing_user = get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail = "El email ya está registrado"
        )

    hashed_password = bcrypt.hash(user.password)

    user_data ={
        "email": user.email,
        "hashed_password": hashed_password,
        "is_active": user.is_active,
        "role": user.role.value,
        "created_at": datetime.utcnow().isoformat()
    }

    profile_data = user.profile.dict() if user.profile else{}

    new_user, new_profile = create_user_in_db(user_data, profile_data)

    response_data = new_user.copy()
    response_data["profile"] = new_profile

    return response_data

@router.get("/", response_model=List[UserResponse])
def get_all_users(current_user: dict = Depends(get_current_user)):
    #TODO
    db = get_db()
    users= db.table('users').all()
    profiles_table = db.table('profiles')

    ProfileQuery= Query()
    for u in users:
        prof = profiles_table.search(ProfileQuery.user_id == u['id'])
        u['profile'] = prof[0] if prof else None
    
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    # TODO:
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db = get_db()
    ProfileQuery = Query()
    prof = db.table('profiles').search(ProfileQuery.user_id == user_id)
    user['profile'] = prof[0] if prof else None
    
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    # TODO:
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db = get_db()
    UserQuery = Query()

    db.table('users').remove(UserQuery.id == user_id)
    db.table('profiles').remove(UserQuery.user_id == user_id)
    return None