from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from auth import create_access_token, decode_access_token, hash_password, oauth2_scheme, verify_password
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, Field, field_validator

REPO_ROOT = Path(__file__).resolve().parents[2]
DATABASE_PATH = REPO_ROOT / "data" / "company_api.db"

UNSET = object()
router = APIRouter(tags=["users"])


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8)
    name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=40)
    address: Optional[str] = Field(default=None, max_length=240)

    @field_validator("name", "phone", "address", mode="before")
    @classmethod
    def blank_optional_as_none(cls, value: object) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return str(value)


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: Optional[str] = Field(default=None, min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: Optional[str] = Field(default=None, min_length=8)
    name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=40)
    address: Optional[str] = Field(default=None, max_length=240)
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

    @field_validator("name", "phone", "address", mode="before")
    @classmethod
    def blank_optional_as_none(cls, value: object) -> Optional[str]:
        return UserCreate.blank_optional_as_none(value)


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=40)
    address: Optional[str] = Field(default=None, max_length=240)

    @field_validator("name", "phone", "address", mode="before")
    @classmethod
    def blank_optional_as_none(cls, value: object) -> Optional[str]:
        return UserCreate.blank_optional_as_none(value)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8)


class UserPublic(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(TokenResponse):
    user: UserPublic


def _connect() -> sqlite3.Connection:
    try:
        DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(DATABASE_PATH)
    except (OSError, sqlite3.Error) as error:
        raise HTTPException(status_code=503, detail="User store is unavailable.") from error
    connection.row_factory = sqlite3.Row
    return connection


def _ensure_user_table() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                hashed_password TEXT NOT NULL,
                name TEXT,
                phone TEXT,
                address TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """
        )
        columns = {row[1] for row in connection.execute("PRAGMA table_info(users)").fetchall()}
        for column in ("name", "phone", "address"):
            if column not in columns:
                connection.execute(f"ALTER TABLE users ADD COLUMN {column} TEXT")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    user = dict(row)
    user["is_active"] = bool(user["is_active"])
    user["is_admin"] = bool(user["is_admin"])
    return user


def _public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name"),
        "phone": user.get("phone"),
        "address": user.get("address"),
        "is_active": user["is_active"],
        "is_admin": user["is_admin"],
        "created_at": user["created_at"],
    }


def count_users() -> int:
    _ensure_user_table()
    with _connect() as connection:
        row = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()
    return int(row["count"])


def create_user(
    email: str,
    password: str,
    *,
    is_active: bool = True,
    is_admin: bool = False,
    name: Optional[str] = None,
    phone: Optional[str] = None,
    address: Optional[str] = None,
) -> dict[str, Any]:
    _ensure_user_table()
    created_at = datetime.now(timezone.utc).isoformat()
    try:
        with _connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (email, hashed_password, name, phone, address, is_active, is_admin, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    _normalize_email(email),
                    hash_password(password),
                    name,
                    phone,
                    address,
                    int(is_active),
                    int(is_admin),
                    created_at,
                ),
            )
            user_id = int(cursor.lastrowid)
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="User with this email already exists") from error

    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=500, detail="User was not created")
    return user


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    _ensure_user_table()
    with _connect() as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return _row_to_dict(row)


def get_user_by_email(email: str) -> dict[str, Any] | None:
    _ensure_user_table()
    with _connect() as connection:
        row = connection.execute("SELECT * FROM users WHERE email = ?", (_normalize_email(email),)).fetchone()
    return _row_to_dict(row)


def list_users() -> list[dict[str, Any]]:
    _ensure_user_table()
    with _connect() as connection:
        rows = connection.execute("SELECT * FROM users ORDER BY id").fetchall()
    return [_row_to_dict(row) for row in rows if row is not None]


def update_user(
    user_id: int,
    *,
    email: str | None = None,
    password: str | None = None,
    name: Any = UNSET,
    phone: Any = UNSET,
    address: Any = UNSET,
    is_active: bool | None = None,
    is_admin: bool | None = None,
) -> dict[str, Any]:
    _ensure_user_table()
    updates: list[str] = []
    values: list[Any] = []
    if email is not None:
        updates.append("email = ?")
        values.append(_normalize_email(email))
    if password is not None:
        updates.append("hashed_password = ?")
        values.append(hash_password(password))
    if name is not UNSET:
        updates.append("name = ?")
        values.append(name)
    if phone is not UNSET:
        updates.append("phone = ?")
        values.append(phone)
    if address is not UNSET:
        updates.append("address = ?")
        values.append(address)
    if is_active is not None:
        updates.append("is_active = ?")
        values.append(int(is_active))
    if is_admin is not None:
        updates.append("is_admin = ?")
        values.append(int(is_admin))

    if not updates:
        user = get_user_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        return user

    values.append(user_id)
    try:
        with _connect() as connection:
            cursor = connection.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="User with this email already exists") from error

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return user


def delete_user(user_id: int) -> dict[str, Any]:
    _ensure_user_table()
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    with _connect() as connection:
        connection.execute("DELETE FROM users WHERE id = ?", (user_id,))
    return user


def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    user = get_user_by_email(email)
    if user is None or not verify_password(password, str(user["hashed_password"])):
        return None
    return user


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict[str, Any]:
    subject = decode_access_token(token)
    try:
        user_id = int(subject)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials") from error

    user = get_user_by_id(user_id)
    if user is None or not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive or missing user",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def _require_self_or_admin(user_id: int, current_user: dict[str, Any]) -> None:
    if current_user["id"] != user_id and not current_user["is_admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")


def _build_auth_response(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "access_token": create_access_token(str(user["id"])),
        "token_type": "bearer",
        "user": _public_user(user),
    }


@router.post("/auth/token", response_model=TokenResponse)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> dict[str, str]:
    user = authenticate_user(form_data.username, form_data.password)
    if user is None or not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"access_token": create_access_token(str(user["id"])), "token_type": "bearer"}


@router.post("/auth/login", response_model=AuthResponse)
def login(body: LoginRequest) -> dict[str, Any]:
    user = authenticate_user(body.email, body.password)
    if user is None or not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _build_auth_response(user)


@router.post("/auth/register", response_model=AuthResponse, status_code=201)
def register_and_login(body: UserCreate) -> dict[str, Any]:
    user = create_user(
        body.email,
        body.password,
        is_admin=count_users() == 0,
        name=body.name,
        phone=body.phone,
        address=body.address,
    )
    return _build_auth_response(user)


@router.get("/auth/me", response_model=UserPublic)
def read_current_user(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return _public_user(current_user)


@router.put("/profiles/me", response_model=UserPublic)
def update_my_profile(
    body: ProfileUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    user = update_user(
        current_user["id"],
        name=body.name if "name" in body.model_fields_set else UNSET,
        phone=body.phone if "phone" in body.model_fields_set else UNSET,
        address=body.address if "address" in body.model_fields_set else UNSET,
    )
    return _public_user(user)


@router.post("/users", response_model=UserPublic, status_code=201)
def register_user(body: UserCreate) -> dict[str, Any]:
    return _public_user(
        create_user(
            body.email,
            body.password,
            is_admin=count_users() == 0,
            name=body.name,
            phone=body.phone,
            address=body.address,
        )
    )


@router.get("/users", response_model=list[UserPublic])
def read_users(current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    return [_public_user(user) for user in list_users()]


@router.get("/users/{user_id}", response_model=UserPublic)
def read_user(user_id: int, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    _require_self_or_admin(user_id, current_user)
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return _public_user(user)


@router.put("/users/{user_id}", response_model=UserPublic)
def replace_user(user_id: int, body: UserUpdate, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    _require_self_or_admin(user_id, current_user)
    if not current_user["is_admin"] and (body.is_active is not None or body.is_admin is not None):
        raise HTTPException(status_code=403, detail="Only an admin can update user status or role")
    user = update_user(
        user_id,
        email=body.email,
        password=body.password,
        name=body.name if "name" in body.model_fields_set else UNSET,
        phone=body.phone if "phone" in body.model_fields_set else UNSET,
        address=body.address if "address" in body.model_fields_set else UNSET,
        is_active=body.is_active if current_user["is_admin"] else None,
        is_admin=body.is_admin if current_user["is_admin"] else None,
    )
    return _public_user(user)


@router.delete("/users/{user_id}", response_model=UserPublic)
def remove_user(user_id: int, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    _require_self_or_admin(user_id, current_user)
    return _public_user(delete_user(user_id))
