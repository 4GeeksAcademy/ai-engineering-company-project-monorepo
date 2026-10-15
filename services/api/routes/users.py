from fastapi import APIRouter, Depends, HTTPException, Response, status

from services.api.auth import storage
from services.api.auth.models import UserCreate, UserPublic, UserUpdate
from services.api.auth.security import get_current_user, hash_password

router = APIRouter(prefix="/users", tags=["users"])


def check_access(current_user, user_id):
    if current_user["role"] != "admin" and current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Acceso prohibido")


@router.post("", response_model=UserPublic, status_code=201)
def create_user(payload: UserCreate):
    try:
        return storage.create_user(
            email=payload.email,
            hashed_password=hash_password(payload.password),
            name=payload.name,
            phone=payload.phone,
            address=payload.address,
        )
    except ValueError:
        raise HTTPException(status_code=409, detail="Email ya registrado")


@router.get("", response_model=list[UserPublic])
def list_users(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    return storage.list_users()


@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: int, current_user=Depends(get_current_user)):
    check_access(current_user, user_id)
    user = storage.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.put("/{user_id}", response_model=UserPublic)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user=Depends(get_current_user),
):
    check_access(current_user, user_id)
    changes = payload.model_dump(exclude_unset=True, mode="json")

    if "role" in changes and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo un admin cambia roles")

    try:
        user = storage.update_user(user_id, changes)
    except ValueError:
        raise HTTPException(status_code=409, detail="Email ya registrado")

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, current_user=Depends(get_current_user)):
    check_access(current_user, user_id)
    if not storage.delete_user(user_id):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return Response(status_code=204)
