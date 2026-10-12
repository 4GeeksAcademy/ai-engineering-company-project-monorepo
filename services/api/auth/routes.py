
from fastapi import APIRouter, Depends, HTTPException, status

from .dependencies import get_current_user
from .models import (
    UserCreate,
    UserPublic,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
)
from .security import create_access_token, verify_password
from .password_reset import (
    create_password_reset_token,
    consume_password_reset_token,
)
from .email_service import send_password_reset_email
from .users import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    update_user,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=201)
def register(user: UserCreate):
    existing = get_user_by_email(user.email)

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El usuario ya existe",
        )

    created = create_user(
        email=user.email,
        password=user.password,
    )

    return created


@router.post("/login")
def login(user: UserCreate):
    existing = get_user_by_email(user.email)

    if not existing or not verify_password(
        user.password,
        existing["hashed_password"],
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas",
        )

    if not existing["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo",
        )

    token = create_access_token(existing["id"])

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserPublic)
def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    user = get_user_by_email(request.email)

    if user and user["is_active"]:
        token = create_password_reset_token(user["id"])

        print(
            "Intentando enviar correo de recuperación "
            f"a: {user['email']}"
        )

        try:
            send_password_reset_email(user["email"], token)
            print("Resend aceptó la solicitud de envío.")
        except RuntimeError as exc:
            print(f"Error enviando correo de recuperación: {exc}")

    return {
        "message": (
            "Si existe una cuenta asociada a ese correo, "
            "recibirás instrucciones para restablecer la contraseña."
        )
    }


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):
    user_id = consume_password_reset_token(request.token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace es inválido o ha caducado",
        )

    user = get_user_by_id(user_id)

    if not user or not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede restablecer la contraseña",
        )

    updated_user = update_user(
        user_id,
        {"password": request.new_password},
    )

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo actualizar la contraseña",
        )

    return {
        "message": "Contraseña restablecida correctamente"
    }


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user=Depends(get_current_user),
):
    if not verify_password(
        request.current_password,
        current_user["hashed_password"],
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta",
        )

    updated_user = update_user(
        current_user["id"],
        {"password": request.new_password},
    )

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo actualizar la contraseña",
        )

    return {
        "message": "Contraseña cambiada correctamente"
    }