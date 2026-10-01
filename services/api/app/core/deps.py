"""FastAPI dependencies: authentication and role-based access control."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.models.user import STAFF_ROLES
from app.services import users as users_service

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """Resolve the authenticated user from the Bearer JWT.

    Returns the public user payload (id, email, is_active, role, ...).
    Raises 401 for missing/invalid tokens or inactive accounts.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = users_service.get_user_by_id(user_id)
    if user is None or not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(*roles: str):
    """Dependency factory: only callers in one of ``roles`` may proceed."""

    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency


# Staff = manager or admin (can update users via PUT /users/{id}).
require_staff = require_roles(*STAFF_ROLES)


def require_any_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Any authenticated (and active) user may proceed.

    Used on routes that expose or modify sensitive data and therefore
    demand authentication without a specific role — anonymous callers
    get 401, authenticated callers without the required role get 403.
    """
    return current_user
