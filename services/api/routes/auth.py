from urllib.parse import parse_qs

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import ValidationError
from passlib.hash import bcrypt

from models import AuthMeResponse, LoginRequest, TokenResponse, User
from security import create_access_token, get_current_user
from user_service import get_profile_by_user_id, get_user_by_email


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=TokenResponse,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["email", "password"],
                        "properties": {
                            "email": {"type": "string", "format": "email"},
                            "password": {"type": "string"},
                        },
                        "additionalProperties": False,
                    }
                }
            },
        }
    },
)
async def login(request: Request):
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        try:
            payload = LoginRequest.model_validate(await request.json())
        except (ValidationError, ValueError) as error:
            raise HTTPException(status_code=422, detail="Indica un email y una contraseña válidos.") from error
    else:
        form = parse_qs((await request.body()).decode())
        email = (form.get("email") or form.get("username") or [None])[0]
        password = (form.get("password") or [None])[0]
        try:
            payload = LoginRequest(email=email, password=password)
        except ValidationError as error:
            raise HTTPException(status_code=422, detail="Indica un email y una contraseña válidos.") from error

    with request.app.state.lock:
        user = get_user_by_email(request.app.state.db, str(payload.email))
    if user is None or not user.is_active or not bcrypt.verify(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token, expires_in = create_access_token(user)
    return TokenResponse(access_token=token, expires_in=expires_in)


@router.get("/me", response_model=AuthMeResponse)
def get_me(request: Request, current_user: User = Depends(get_current_user)):
    with request.app.state.lock:
        profile = get_profile_by_user_id(request.app.state.db, current_user.id)
    return AuthMeResponse(email=current_user.email, role=current_user.role, profile=profile)