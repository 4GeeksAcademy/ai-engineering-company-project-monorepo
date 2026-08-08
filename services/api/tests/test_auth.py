"""Tests for the auth service layer — security, JWT creation/validation,
and user lookup — all tested at the function level (no FastAPI TestClient).
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest
from jose import ExpiredSignatureError, JWTError
from jose import jwt as pyjwt

from src.models.user import User, UserRole
from src.services.auth_service import (
    _get_access_token_expire_minutes,
    _get_algorithm,
    _get_secret_key,
    create_access_token,
    get_current_user,
)
from src.services.security import (
    MAX_BCRYPT_PASSWORD_BYTES,
    PasswordValidationError,
    _password_byte_length,
    hash_password,
    validate_password,
    verify_password,
)
from src.services.user_service import (
    delete_user,
    get_user_by_email,
    get_user_by_id,
    list_users,
    update_user,
    update_user_password,
)

# ======================================================================
# _get_secret_key
# ======================================================================


class TestGetSecretKey:
    def test_returns_env_var_when_set(self):
        """Happy path: SECRET_KEY is set → returns a non-empty string."""
        result = _get_secret_key()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_fallback_when_env_var_not_set(self, monkeypatch):
        """Boundary: SECRET_KEY is unset → returns dev fallback."""
        monkeypatch.delenv("SECRET_KEY", raising=False)
        result = _get_secret_key()
        assert result == "trackflow-dev-secret-key"

    def test_fallback_when_env_var_empty(self, monkeypatch):
        """Boundary: SECRET_KEY is empty string → falls back to dev key."""
        monkeypatch.setenv("SECRET_KEY", "")
        result = _get_secret_key()
        assert result == "trackflow-dev-secret-key"


# ======================================================================
# _get_algorithm
# ======================================================================


class TestGetAlgorithm:
    def test_default_algorithm(self):
        """Happy path: ALGORITHM unset → HS256."""
        assert _get_algorithm() == "HS256"

    def test_returns_configured_algorithm(self, monkeypatch):
        """Happy path: ALGORITHM is set → returns it (stripped)."""
        monkeypatch.setenv("ALGORITHM", "  HS512  ")
        assert _get_algorithm() == "HS512"

    def test_empty_algorithm_falls_back(self, monkeypatch):
        """Boundary: ALGORITHM set to empty → falls back to HS256."""
        monkeypatch.setenv("ALGORITHM", "")
        assert _get_algorithm() == "HS256"


# ======================================================================
# _get_access_token_expire_minutes
# ======================================================================


class TestGetAccessTokenExpireMinutes:
    def test_default_expiry(self):
        """Happy path: ACCESS_TOKEN_EXPIRE_MINUTES unset → 30."""
        assert _get_access_token_expire_minutes() == 30

    def test_custom_expiry(self, monkeypatch):
        """Happy path: custom integer value."""
        for val in ["1", "15", "60", "1440"]:
            monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", val)
            assert _get_access_token_expire_minutes() == int(val)

    @pytest.mark.parametrize("invalid_value", ["abc", "12.5", "", "  ", "0xff"])
    def test_invalid_value_raises_runtime_error(self, monkeypatch, invalid_value):
        """Failure: non-integer value → RuntimeError."""
        monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", invalid_value)
        with pytest.raises(RuntimeError, match="must be an integer"):
            _get_access_token_expire_minutes()

    def test_zero_raises_runtime_error(self, monkeypatch):
        """Boundary: zero → RuntimeError."""
        monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "0")
        with pytest.raises(RuntimeError, match="greater than zero"):
            _get_access_token_expire_minutes()

    def test_negative_raises_runtime_error(self, monkeypatch):
        """Boundary: negative → RuntimeError."""
        monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "-5")
        with pytest.raises(RuntimeError, match="greater than zero"):
            _get_access_token_expire_minutes()


# ======================================================================
# create_access_token
# ======================================================================


class TestCreateAccessToken:
    def test_returns_valid_jwt(self):
        """Happy path: returns a 3-part JWT string for a valid user id."""
        token = create_access_token(user_id=42)
        parts = token.split(".")
        assert len(parts) == 3
        assert all(len(p) > 0 for p in parts)

    def test_token_contains_correct_subject(self):
        """Happy path: decoded payload contains the exact user id as sub."""
        token = create_access_token(user_id=42)
        payload = pyjwt.decode(
            token,
            _get_secret_key(),
            algorithms=[_get_algorithm()],
        )
        assert payload["sub"] == "42"

    def test_token_contains_exp_claim(self):
        """Happy path: decoded payload includes an exp claim (int)."""
        token = create_access_token(user_id=1)
        payload = pyjwt.decode(
            token,
            _get_secret_key(),
            algorithms=[_get_algorithm()],
        )
        assert isinstance(payload["exp"], int)

    def test_exp_is_roughly_correct(self):
        """Boundary: exp ≈ now + configured minutes (allow ~2s skew)."""
        token = create_access_token(user_id=1)
        payload = pyjwt.decode(
            token,
            _get_secret_key(),
            algorithms=[_get_algorithm()],
        )
        expected = datetime.now(timezone.utc) + timedelta(minutes=30)
        token_exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        diff = abs((token_exp - expected).total_seconds())
        assert diff < 3  # Allow 3 seconds of clock skew

    def test_accepts_string_user_id(self):
        """Boundary: TinyDBId as string → stored as string in sub."""
        token = create_access_token(user_id="99")
        payload = pyjwt.decode(
            token,
            _get_secret_key(),
            algorithms=[_get_algorithm()],
        )
        assert payload["sub"] == "99"

    def test_different_ids_produce_different_tokens(self):
        """Edge: two calls with different IDs yield different tokens."""
        token_a = create_access_token(user_id=1)
        token_b = create_access_token(user_id=2)
        assert token_a != token_b


# ======================================================================
# get_current_user
# ======================================================================


class TestGetCurrentUser:
    def test_returns_user_for_valid_token(self, test_user, auth_token):
        """Happy path: valid token → returns User object with correct email."""
        user, _ = test_user
        result = get_current_user(auth_token)
        assert isinstance(result, User)
        assert result.email == "qa@trackflow.io"
        assert result.id == user.id

    def test_inactive_user_still_returns_user(self, test_user, auth_token):
        """Boundary: is_active=False — currently NOT checked by get_current_user.

        This test verifies the *current* behaviour so any future change
        that adds an is_active guard will break this test intentionally.
        """
        from src.database import get_users_table

        # Manually deactivate the user in the DB
        user, _ = test_user
        get_users_table().update({"is_active": False}, doc_ids=[user.id])
        result = get_current_user(auth_token)
        assert result is not None
        assert result.email == "qa@trackflow.io"
        assert result.is_active is False

    def test_expired_token_raises_401(self, expired_token):
        """Failure: expired token → HTTPException 401."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(expired_token)
        assert exc_info.value.status_code == 401
        assert "validate credentials" in exc_info.value.detail

    def test_tampered_token_raises_401(self, tampered_token):
        """Failure: corrupted signature → HTTPException 401."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(tampered_token)
        assert exc_info.value.status_code == 401

    @pytest.mark.parametrize(
        "bad_token,reason",
        [
            ("", "empty string"),
            ("not-a-jwt", "no dots"),
            ("a.b", "only two parts"),
            ("a.b.c.d", "four parts"),
        ],
    )
    def test_malformed_tokens_raises_401(self, bad_token, reason):
        """Failure: various malformed token shapes → HTTPException 401."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(bad_token)
        assert exc_info.value.status_code == 401

    def test_token_with_missing_sub_raises_401(self, token_with_missing_sub):
        """Failure: valid JWT but no 'sub' claim → HTTPException 401."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token_with_missing_sub)
        assert exc_info.value.status_code == 401

    def test_token_with_nonexistent_user_raises_401(self, fresh_db):
        """Failure: token for user that was deleted → HTTPException 401."""
        # Create a user, get a token, then delete the user
        from src.services.user_service import create_user, delete_user

        user = create_user(
            email="temp@trackflow.io",
            password="Temp1234!",
        )
        token = create_access_token(user.id)
        delete_user(user.id)

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token)
        assert exc_info.value.status_code == 401

    def test_token_signed_with_different_key(self, test_user, monkeypatch):
        """Failure: token signed with different key → JWTError → 401."""
        user, _ = test_user
        from datetime import datetime, timedelta, timezone
        from jose import jwt

        # Sign with a DIFFERENT key
        payload = {
            "sub": str(user.id),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        rogue_token = jwt.encode(payload, "different-secret", algorithm="HS256")

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(rogue_token)
        assert exc_info.value.status_code == 401

    def test_token_algorithm_mismatch(self, test_user, monkeypatch):
        """Failure: token signed with HS512 but server expects HS256 → 401."""
        user, _ = test_user
        from datetime import datetime, timedelta, timezone
        from jose import jwt

        payload = {
            "sub": str(user.id),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        hs512_token = jwt.encode(payload, _get_secret_key(), algorithm="HS512")

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(hs512_token)
        assert exc_info.value.status_code == 401


# ======================================================================
# validate_password  (security module)
# ======================================================================


class TestValidatePassword:
    def test_valid_password_passes(self):
        """Happy path: a normal password does not raise."""
        validate_password("Str0ng!Pass")  # should not raise

    def test_empty_password_raises(self):
        """Failure: empty string → PasswordValidationError."""
        with pytest.raises(PasswordValidationError, match="must not be empty"):
            validate_password("")

    def test_whitespace_only_password_is_not_empty(self):
        """Boundary: only spaces — string is truthy, so it passes."""
        # This test documents current behaviour: spaces are allowed.
        validate_password("     ")  # should not raise

    @pytest.mark.parametrize(
        "password",
        [
            "a" * (MAX_BCRYPT_PASSWORD_BYTES + 1),
            "a" * 200,
            "\U0001f600" * 19,  # 19 emojis × 4 bytes = 76 > 72 → too long
        ],
        ids=["73-ascii", "200-ascii", "19-emojis"],
    )
    def test_password_exceeds_max_bytes(self, password):
        """Boundary: password byte-length > 72 → PasswordValidationError."""
        with pytest.raises(PasswordValidationError, match="cannot exceed"):
            validate_password(password)

    def test_password_at_exactly_72_bytes(self):
        """Boundary: exactly 72 bytes → passes."""
        pwd = "a" * MAX_BCRYPT_PASSWORD_BYTES  # 72 bytes
        _byte_len = _password_byte_length(pwd)
        assert _byte_len == MAX_BCRYPT_PASSWORD_BYTES
        validate_password(pwd)  # should not raise

    @pytest.mark.parametrize(
        "password",
        [
            "a" * 71,
            "a" * 72,
            "Passw0rd!",
            "ñ" * 36,  # 36 × 2 bytes = 72 → exactly at limit
        ],
        ids=["71-char", "72-char", "typical-strong", "36-unicode"],
    )
    def test_valid_password_lengths(self, password):
        """Boundary: various valid lengths all pass."""
        validate_password(password)  # should not raise for any


# ======================================================================
# hash_password  (security module)
# ======================================================================


class TestHashPassword:
    def test_hash_returns_non_empty_string(self):
        """Happy path: hash is a non-empty string."""
        hashed = hash_password("ValidPass1!")
        assert isinstance(hashed, str)
        assert len(hashed) > 0

    def test_hash_starts_with_bcrypt_prefix(self):
        """Happy path: bcrypt hash starts with $2b$."""
        hashed = hash_password("ValidPass1!")
        assert hashed.startswith("$2b$")

    def test_same_password_yields_different_hashes(self):
        """Edge: bcrypt includes salt → two hashes of same password differ."""
        h1 = hash_password("ValidPass1!")
        h2 = hash_password("ValidPass1!")
        assert h1 != h2

    def test_invalid_password_raises(self):
        """Failure: empty password → delegates to validate_password."""
        with pytest.raises(PasswordValidationError):
            hash_password("")

    def test_password_exceeding_max_bytes_raises(self):
        """Failure: >72 bytes → delegates to validate_password."""
        with pytest.raises(PasswordValidationError):
            hash_password("a" * (MAX_BCRYPT_PASSWORD_BYTES + 1))


# ======================================================================
# verify_password  (security module)
# ======================================================================


class TestVerifyPassword:
    def test_correct_password_returns_true(self):
        """Happy path: correct password matches its hash."""
        hashed = hash_password("ValidPass1!")
        assert verify_password("ValidPass1!", hashed) is True

    def test_wrong_password_returns_false(self):
        """Failure: wrong password → False."""
        hashed = hash_password("ValidPass1!")
        assert verify_password("WrongPass1!", hashed) is False

    @pytest.mark.parametrize(
        "password,hashed",
        [
            ("", "$2b$12$abcdefghijklmnopqrstuu"),
            ("somepass", ""),
            ("", ""),
        ],
        ids=["empty-password", "empty-hash", "both-empty"],
    )
    def test_empty_inputs_return_false(self, password, hashed):
        """Boundary: empty password or hash → False (no crash)."""
        assert verify_password(password, hashed) is False

    @pytest.mark.parametrize(
        "long_password",
        [
            "a" * (MAX_BCRYPT_PASSWORD_BYTES + 1),
            "b" * 100,
        ],
        ids=["73-bytes", "100-bytes"],
    )
    def test_password_too_long_returns_false(self, long_password):
        """Boundary: password >72 bytes → False (no exception)."""
        hashed = hash_password("ValidPass1!")
        assert verify_password(long_password, hashed) is False

    def test_none_password_returns_false(self):
        """Edge: None explicitly — note: typed as str but guard covers truthiness."""
        # The function signature says str but we test defensive behaviour
        result = verify_password(None, "$2b$12$abc")  # type: ignore[arg-type]
        assert result is False

    def test_none_hash_returns_false(self):
        """Edge: None hash — note: typed as str but guard covers truthiness."""
        hashed = hash_password("ValidPass1!")
        result = verify_password("ValidPass1!", None)  # type: ignore[arg-type]
        assert result is False


# ======================================================================
# Integration: user_service functions used by auth
# ======================================================================


class TestGetUserByEmail:
    def test_finds_existing_user(self, test_user):
        """Happy path: existing email → User model."""
        user, _ = test_user
        found = get_user_by_email("qa@trackflow.io")
        assert found is not None
        assert found.email == user.email
        assert found.id == user.id

    def test_case_sensitive_lookup(self, test_user):
        """Edge: same email with different case → None (no normalisation)."""
        found = get_user_by_email("QA@trackflow.io")
        assert found is None

    def test_with_trailing_whitespace(self, test_user):
        """Edge: email with trailing space → None (no strip in lookup)."""
        found = get_user_by_email("qa@trackflow.io ")
        assert found is None

    def test_returns_none_for_missing_email(self):
        """Failure: non-existent email → None."""
        assert get_user_by_email("nobody@nowhere.com") is None

    def test_empty_email(self):
        """Boundary: empty string → None."""
        assert get_user_by_email("") is None


class TestGetUserById:
    def test_finds_existing_user(self, test_user):
        """Happy path: existing id → User model."""
        user, _ = test_user
        found = get_user_by_id(user.id)
        assert found is not None
        assert found.email == user.email

    def test_returns_none_for_nonexistent_id(self):
        """Failure: non-existent id → None."""
        assert get_user_by_id(99999) is None

    def test_zero_id_returns_none(self):
        """Boundary: id=0 → None (filtered by _get_user_document_by_id)."""
        assert get_user_by_id(0) is None

    def test_negative_id_returns_none(self):
        """Boundary: negative id → None."""
        assert get_user_by_id(-1) is None

    def test_float_string_returns_none(self):
        """Boundary: string that isn't purely digits → stays string → not int → None."""
        assert get_user_by_id("12.5") is None

    def test_alpha_string_returns_none(self):
        """Boundary: non-digit string → stays str → not int → None."""
        assert get_user_by_id("abc") is None

    def test_string_digit_normalises_to_int(self, test_user):
        """Boundary: string digit normalises to int → finds user."""
        user, _ = test_user
        found = get_user_by_id(str(user.id))
        assert found is not None
        assert found.email == user.email


class TestUpdateUserPassword:
    def test_updates_password_successfully(self, test_user):
        """Happy path: update to valid new password."""
        user, _ = test_user
        updated = update_user_password(user.id, "NewStr0ng!Pass")
        assert updated is not None
        # Verify the NEW password works
        assert verify_password("NewStr0ng!Pass", updated.hashed_password) is True
        # Verify the OLD password no longer works
        assert verify_password("Str0ng!Pass", updated.hashed_password) is False

    def test_returns_none_for_nonexistent_user(self):
        """Failure: non-existent user → None."""
        assert update_user_password(99999, "AnyPass123!") is None

    def test_invalid_password_raises(self, fresh_db):
        """Failure: empty password → PasswordValidationError.

        Must use an existing user so the error comes from
        hash_password validation, not from missing user.
        """
        from src.services.user_service import create_user

        user = create_user(
            email="pwd-test@trackflow.io",
            password="ValidInit1!",
        )
        with pytest.raises(PasswordValidationError):
            update_user_password(user.id, "")

    def test_too_long_password_raises(self, fresh_db):
        """Boundary: >72 bytes → PasswordValidationError."""
        from src.services.user_service import create_user

        user = create_user(
            email="pwd-long@trackflow.io",
            password="ValidInit2!",
        )
        with pytest.raises(PasswordValidationError):
            update_user_password(user.id, "a" * (MAX_BCRYPT_PASSWORD_BYTES + 1))


# ======================================================================
# Additional edge: password reset token validation helpers
# ======================================================================


class TestPasswordByteLength:
    @pytest.mark.parametrize(
        "password,expected_bytes",
        [
            ("", 0),
            ("a", 1),
            ("abc", 3),
            ("ñ", 2),         # ñ is 2 bytes in UTF-8
            ("\U0001f600", 4),  # 😀 is 4 bytes
            ("a" * 72, 72),
        ],
    )
    def test_byte_length_calculation(self, password, expected_bytes):
        """Unit: _password_byte_length returns correct UTF-8 byte count."""
        assert _password_byte_length(password) == expected_bytes


# ======================================================================
# Edge: timing and concurrency-related scenarios
# ======================================================================


class TestJWTLeeway:
    """Verify behaviour around the exact moment of token expiry.

    jose does NOT apply leeway by default — a token whose `exp` is in
    the past raises ExpiredSignatureError.
    """

    def test_token_expired_one_second_ago(self, test_user):
        """Boundary: exp = now - 1s → rejected."""
        from datetime import datetime, timedelta, timezone

        user, _ = test_user
        payload = {
            "sub": str(user.id),
            "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
        }
        expired_token = pyjwt.encode(
            payload, _get_secret_key(), algorithm=_get_algorithm()
        )

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(expired_token)
        assert exc_info.value.status_code == 401

    def test_token_not_yet_valid_exp_future(self, test_user):
        """Happy path: token with future exp → accepted."""
        from datetime import datetime, timedelta, timezone

        user, _ = test_user
        payload = {
            "sub": str(user.id),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        future_token = pyjwt.encode(
            payload, _get_secret_key(), algorithm=_get_algorithm()
        )

        result = get_current_user(future_token)
        assert result is not None
        assert result.email == "qa@trackflow.io"


# ======================================================================
# Additional user_service operations used indirectly by auth
# ======================================================================


class TestListUsers:
    def test_returns_all_users(self, test_user, test_admin_user):
        """Happy path: multiple users created → all returned."""
        users = list_users()
        emails = {u.email for u in users}
        assert "qa@trackflow.io" in emails
        assert "admin@trackflow.io" in emails
        assert len(users) >= 2


class TestUpdateUser:
    def test_update_email_successfully(self, fresh_db):
        """Happy path: update email for an existing user."""
        from src.services.user_service import create_user

        user = create_user(
            email="old@trackflow.io",
            password="OldPass123!",
        )
        updated = update_user(user.id, {"email": "new@trackflow.io"})
        assert updated is not None
        assert updated.email == "new@trackflow.io"
        # Old email no longer resolves
        assert get_user_by_email("old@trackflow.io") is None

    def test_update_password_successfully(self, fresh_db):
        """Happy path: update password via update_user."""
        from src.services.user_service import create_user

        user = create_user(
            email="changeme@trackflow.io",
            password="OldPass123!",
        )
        updated = update_user(user.id, {"password": "NewPass456!"})
        assert updated is not None
        assert verify_password("NewPass456!", updated.hashed_password) is True
        assert verify_password("OldPass123!", updated.hashed_password) is False

    def test_update_role(self, fresh_db):
        """Happy path: promote user role."""
        from src.services.user_service import create_user

        user = create_user(
            email="rolechange@trackflow.io",
            password="Pass1234!",
        )
        updated = update_user(user.id, {"role": "admin"})
        assert updated is not None
        assert updated.role == UserRole.ADMIN

    def test_update_nonexistent_user_returns_none(self):
        """Failure: non-existent user → None."""
        assert update_user(99999, {"email": "any@any.com"}) is None

    def test_update_duplicate_email_raises(self, fresh_db):
        """Failure: email already taken by another user → ValueError."""
        from src.services.user_service import create_user

        user_a = create_user(
            email="first@trackflow.io",
            password="Pass1234!",
        )
        user_b = create_user(
            email="second@trackflow.io",
            password="Pass5678!",
        )
        with pytest.raises(ValueError, match="already exists"):
            update_user(user_a.id, {"email": "second@trackflow.io"})

    def test_update_self_email_does_not_raise(self, fresh_db):
        """Boundary: update user to its own email → no error (same doc_id)."""
        from src.services.user_service import create_user

        user = create_user(
            email="myself@trackflow.io",
            password="Pass1234!",
        )
        updated = update_user(user.id, {"email": "myself@trackflow.io"})
        assert updated is not None
        assert updated.email == "myself@trackflow.io"

    def test_update_with_no_mutable_fields_returns_unchanged(self, fresh_db):
        """Boundary: update with only non-mutable fields → user unchanged."""
        from src.services.user_service import create_user

        user = create_user(
            email="noop@trackflow.io",
            password="Pass1234!",
        )
        updated = update_user(user.id, {"created_at": "yesterday"})
        assert updated is not None
        assert updated.email == "noop@trackflow.io"


class TestDeleteUser:
    def test_delete_existing_user(self, fresh_db):
        """Happy path: delete existing user → True and user gone."""
        from src.services.user_service import create_user

        user = create_user(
            email="todelete@trackflow.io",
            password="Pass1234!",
        )
        user_id = user.id
        assert delete_user(user_id) is True
        assert get_user_by_id(user_id) is None

    def test_delete_nonexistent_user_returns_false(self):
        """Failure: non-existent user → False."""
        assert delete_user(99999) is False

    def test_delete_with_string_user_id(self, fresh_db):
        """Boundary: string numeric id → normalised and deleted."""
        from src.services.user_service import create_user

        user = create_user(
            email="str-id@trackflow.io",
            password="Pass1234!",
        )
        assert delete_user(str(user.id)) is True
        assert get_user_by_id(user.id) is None

    def test_delete_with_non_numeric_string_id_returns_false(self):
        """Boundary: non-numeric string id → can't find document → False.

        This exercises the else branch in delete_user where
        normalized_id is a non-int (string that isn't purely digits).
        """
        # A non-digit string won't normalise to int, so
        # _get_user_document_by_id returns None early → delete_user returns False.
        assert delete_user("uuid-abc-123") is False