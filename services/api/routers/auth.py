"""Backoffice login — issues the JWT used by tickets and the SSE stream."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from auth import authenticate_user, create_access_token
from fastapi import APIRouter, HTTPException, status
from telemetry_capture import record_event

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    name: str
    role: str


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    user = authenticate_user(payload.username, payload.password)
    if user is None:
        record_event("user_login_failed", {"username": payload.username})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token(user["username"])
    record_event("user_login_succeeded", {"username": user["username"], "role": user["role"]})
    return LoginResponse(
        access_token=token,
        username=user["username"],
        name=user["name"],
        role=user["role"],
    )
