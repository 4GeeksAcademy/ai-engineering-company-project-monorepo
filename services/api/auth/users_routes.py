from fastapi import APIRouter, Depends, HTTPException, status

from .dependencies import get_current_user
from .models import UserPublic, UserUpdate
from .db import get_db
from .users import delete_user, update_user


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


@router.put("/{user_id}", response_model=UserPublic)
def update_user_route(
    user_id: int,
    user_data: UserUpdate,
    current_user=Depends(get_current_user),
):
    if current_user["role"] != "admin" and current_user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para modificar este usuario",
        )

    data = user_data.model_dump(exclude_unset=True)

    if current_user["role"] != "admin":
        data.pop("is_active", None)
        data.pop("role", None)

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar",
        )

    updated = update_user(user_id, data)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    return updated


@router.delete("/{user_id}")
def delete_user_route(
    user_id: int,
    current_user=Depends(get_current_user),
):
    if current_user["role"] != "admin" and current_user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este usuario",
        )

    deleted = delete_user(user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    return {"message": "Usuario eliminado"}
