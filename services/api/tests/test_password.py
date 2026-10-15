"""Password hashing (``auth.security.hash_password`` / ``verify_password``): the only way a password is ever stored.

Layout shared by every auth test module (``test_register``, ``test_login``, ``test_token``, ``test_session``,
``test_password``, ``test_cli``): three sections, in this order, HAPPY PATH, EDGE CASES, FAILURE MODES;
each test is Arrange / Act / Assert and asserts a business rule, never an HTTP representation.
"""

from __future__ import annotations

import pytest

from auth.security import hash_password, verify_password

PASSWORD = "correct-horse-battery"


# --- HAPPY PATH ---------------------------------------------------------------------------------------


def test_a_password_is_stored_as_a_salted_bcrypt_hash_that_never_contains_it():
    first, second = hash_password(PASSWORD), hash_password(PASSWORD)

    assert first.startswith("$2b$") and second.startswith("$2b$")
    assert first != second  # a fresh random salt every time
    assert PASSWORD not in first


def test_the_right_password_verifies_against_its_hash():
    assert verify_password(PASSWORD, hash_password(PASSWORD)) is True


# --- EDGE CASES --------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "attempt",
    [PASSWORD.upper(), PASSWORD + " ", " " + PASSWORD, PASSWORD[:-1], PASSWORD + "x", "", " "],
    ids=["case", "trailing-space", "leading-space", "prefix", "suffix", "empty", "blank"],
)
def test_only_the_exact_password_verifies(attempt):
    assert verify_password(attempt, hash_password(PASSWORD)) is False


def test_bcrypts_72_byte_limit_is_honoured_instead_of_silently_truncating():
    exactly = "x" * 72
    stored = hash_password(exactly)

    assert verify_password(exactly, stored) is True
    assert verify_password(exactly + "y", stored) is False  # same first 72 bytes, still a different password
    assert verify_password("x" * 100, stored) is False


def test_a_password_of_72_bytes_made_of_multibyte_characters_round_trips():
    password = "é" * 36  # 72 bytes in UTF-8

    assert verify_password(password, hash_password(password)) is True


# --- FAILURE MODES -----------------------------------------------------------------------------------


@pytest.mark.parametrize("bad_hash", ["", "plain-text", PASSWORD, "$2b$12$short", "$2b$12$" + "!" * 53, "$1$salt$hash"])
def test_a_malformed_stored_hash_never_verifies_and_never_raises(bad_hash):
    assert verify_password(PASSWORD, bad_hash) is False


def test_a_password_stored_in_plain_text_would_not_verify():
    """Guards against a refactor that skips hashing: the stored value is not itself a valid credential."""
    assert verify_password(PASSWORD, PASSWORD) is False


def test_a_nul_byte_in_the_attempt_is_a_plain_mismatch_not_an_error():
    assert verify_password("pass\x00word", hash_password(PASSWORD)) is False
