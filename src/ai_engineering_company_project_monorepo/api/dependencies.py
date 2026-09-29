from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from tinydb import TinyDB

from ai_engineering_company_project_monorepo.api.settings import get_jwt_secret_key
from ai_engineering_company_project_monorepo.models.user import User
from ai_engineering_company_project_monorepo.services.user_service import get_user_by_id


bearer_scheme = HTTPBearer(auto_error=False)


def get_database(request: Request) -> TinyDB:
    return request.app.state.database


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    database: Annotated[TinyDB, Depends(get_database)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing bearer token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        if credentials is None:
            raise ValueError("Missing bearer credentials")

        secret_key = get_jwt_secret_key()
        claims = jwt.decode(credentials.credentials, secret_key, algorithms=["HS256"])
        user_id = claims.get("sub")
        if not isinstance(user_id, str):
            raise ValueError("JWT subject is missing")

        user = get_user_by_id(database, user_id)
        if user is None or not user.is_active:
            raise ValueError("User is missing or inactive")
        return user
    except Exception as error:
        raise unauthorized from error