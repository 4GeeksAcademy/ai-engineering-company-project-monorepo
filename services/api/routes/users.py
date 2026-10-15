from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from models import User, UserRegister, UserResponse, UserRole, UserUpdate
from security import get_current_user
from user_service import create_user, delete_user, get_user_by_id, list_users, update_user


router = APIRouter(prefix="/users", tags=["users"])


def public_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        role=user.role,
        created_at=user.created_at,
    )


def require_owner_or_admin(target_user_id: int, current_user: User) -> None:
    if current_user.id != target_user_id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para acceder a este usuario.")


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegister, request: Request):
    try:
        user = create_user(
            request.app.state.db,
            request.app.state.lock,
            str(payload.email),
            payload.password,
            {"name": payload.name, "phone": payload.phone, "address": payload.address},
        )
    except ValueError as error:
        if str(error) == "email_exists":
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email.") from error
        raise
    return public_user(user)


@router.get("", response_model=list[UserResponse])
def get_users(request: Request, current_user: User = Depends(get_current_user)):
    with request.app.state.lock:
        users = list_users(request.app.state.db)
    return [public_user(user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, request: Request, current_user: User = Depends(get_current_user)):
    require_owner_or_admin(user_id, current_user)
    with request.app.state.lock:
        user = get_user_by_id(request.app.state.db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return public_user(user)


@router.put("/{user_id}", response_model=UserResponse)
def put_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    require_owner_or_admin(user_id, current_user)
    changes = payload.model_dump(exclude_unset=True)
    if not changes or any(value is None for value in changes.values()):
        raise HTTPException(status_code=422, detail="Indica al menos un campo válido para actualizar.")
    if "role" in changes and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Solo un administrador puede cambiar roles.")
    try:
        user = update_user(request.app.state.db, request.app.state.lock, user_id, changes)
    except ValueError as error:
        if str(error) == "email_exists":
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email.") from error
        raise
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return public_user(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user(user_id: int, request: Request, current_user: User = Depends(get_current_user)):
    require_owner_or_admin(user_id, current_user)
    if not delete_user(request.app.state.db, request.app.state.lock, user_id):
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)