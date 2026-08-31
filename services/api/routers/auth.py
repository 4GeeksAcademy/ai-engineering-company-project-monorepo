from fastapi import APIRouter, Depends, HTTPException, status
from tinydb import Query

from database import document_to_dict, users_table
from models import (
    LoginRequest,
    TokenResponse,
    UserResponse,
)
from security import (
    create_access_token,
    get_current_user,
    verify_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(payload: LoginRequest):
    User = Query()

    user_docs = users_table.search(User.email == payload.email)

    if not user_docs:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_doc = user_docs[0]
    user_data = document_to_dict(user_doc)

    if not verify_password(payload.password, user_data["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_data.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(user_doc.doc_id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
def me(
    current_user: UserResponse = Depends(get_current_user),
):
    return current_user