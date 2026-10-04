from fastapi import APIRouter, HTTPException, status

from .models import UserCreate, UserPublic
from .security import create_access_token, verify_password
from .users import create_user, get_user_by_email

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
