from fastapi import APIRouter, Depends

from .dependencies import get_current_user
from .models import UserPublic
from .db import get_db


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
def get_my_user(current_user=Depends(get_current_user)):
    return current_user


@router.get("/", response_model=list[UserPublic])
def get_users(current_user=Depends(get_current_user)):
    db = get_db()
    users = db.all()
    db.close()
    return users
