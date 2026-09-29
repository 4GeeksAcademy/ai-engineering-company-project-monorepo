from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from tinydb import TinyDB

from ai_engineering_company_project_monorepo.api.dependencies import get_current_user, get_database
from ai_engineering_company_project_monorepo.api.schemas import (
    AccessTokenResponse,
    AuthMeResponse,
    AuthProfileResponse,
    LoginRequest,
)
from ai_engineering_company_project_monorepo.api.settings import (
    get_access_token_expire_minutes,
    get_jwt_secret_key,
)
from ai_engineering_company_project_monorepo.models.user import User
from ai_engineering_company_project_monorepo.services.profile_service import get_profile_by_user_id
from ai_engineering_company_project_monorepo.services.user_service import get_user_by_email


router = APIRouter(prefix="/auth", tags=["auth"])
Database = Annotated[TinyDB, Depends(get_database)]
CurrentUser = Annotated[User, Depends(get_current_user)]
@router.post("/login", response_model=AccessTokenResponse)
def login(payload: LoginRequest, database: Database) -> AccessTokenResponse:
    user = get_user_by_email(database, str(payload.email))
    valid_password = False
    if user is not None:
        try:
            valid_password = bcrypt.checkpw(
                payload.password.encode("utf-8"),
                user.hashed_password.encode("ascii"),
            )
        except (ValueError, UnicodeEncodeError):
            valid_password = False

    if user is None or not user.is_active or not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        secret_key = get_jwt_secret_key()
        expire_minutes = get_access_token_expire_minutes()
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token configuration is invalid",
        ) from error

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    token = jwt.encode(
        {"sub": user.id, "exp": expires_at},
        secret_key,
        algorithm="HS256",
    )
    return AccessTokenResponse(
        access_token=token,
        expires_in=expire_minutes * 60,
    )


@router.get("/me", response_model=AuthMeResponse)
def read_authenticated_user(
    current_user: CurrentUser,
    database: Database,
) -> AuthMeResponse:
    profile = get_profile_by_user_id(database, current_user.id)
    return AuthMeResponse(
        email=current_user.email,
        role=current_user.role,
        profile=(
            AuthProfileResponse(
                name=profile.name,
                phone=profile.phone,
                address=profile.address,
            )
            if profile is not None
            else None
        ),
    )