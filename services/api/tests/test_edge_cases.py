"""Edge cases proposed by the AI assistant after probing the running system with hostile inputs (TESTING.md, section 8).

Every test here carries the ``ai_suggested`` marker: ``uv run pytest -m ai_suggested`` runs only these.

Layout shared by every auth test module: HAPPY PATH, EDGE CASES, FAILURE MODES; Arrange / Act / Assert. In this
module the sections mean:

* HAPPY PATH: behaviour the probes showed to be robust today, kept as a regression guard;
* EDGE CASES: boundaries whose current behaviour is now written down so nobody changes it by accident;
* FAILURE MODES: weaknesses the probes exposed. They fail today and each is ``xfail(strict=True)`` with the decision
  it waits for. ``strict`` makes the suite fail the day the code starts passing it: that is the moment to delete the
  marker. None of them changes production code; the numbers refer to the table in TESTING.md, section 8.
"""

from __future__ import annotations

import asyncio
import unicodedata

import pytest

from auth.security import create_access_token, decode_access_token
from conftest import ALICE, BOB, CAROL, FAR_FUTURE, PASSWORD, headers_for, signed_token, uuid_of
from core.config import get_access_token_expire_minutes

pytestmark = [pytest.mark.anyio, pytest.mark.ai_suggested]

NEW = {"email": "nuevo@example.com", "password": "s3cret-pass!"}
BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"


async def register(client, **overrides):
    return await client.post("/users", json={**NEW, **overrides})


async def login(client, email: str, password: str):
    return await client.post("/auth/login", data={"username": email, "password": password})


# --- HAPPY PATH (robust today) --------------------------------------------------------------------------


def test_a_token_with_any_single_character_changed_is_never_accepted():
    token = create_access_token(uuid_of(ALICE))

    accepted = [
        (position, replacement)
        for position in range(len(token) - 1)  # the last character is the known exception, see failure mode #6
        for replacement in "A-_0"
        if replacement != token[position] and decode_access_token(token[:position] + replacement + token[position + 1 :]) is not None
    ]

    assert accepted == []


async def test_twenty_simultaneous_sign_ups_with_the_same_email_create_exactly_one_account(async_client, users_db):
    responses = await asyncio.gather(*[register(async_client) for _ in range(20)])

    assert sorted(r.status_code for r in responses) == [201] + [409] * 19
    assert len([doc for doc in users_db.all() if doc["email"] == NEW["email"]]) == 1


async def test_a_cors_preflight_from_an_unknown_origin_is_refused(async_client):
    response = await async_client.options(
        "/auth/login", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"}
    )

    assert "access-control-allow-origin" not in response.headers
    assert not response.is_success


async def test_an_email_with_an_invisible_character_is_refused(async_client, users_db):
    response = await register(async_client, email="ali​ce@example.com")  # zero-width space

    assert not response.is_success
    assert len(users_db) == 3


# --- EDGE CASES (current behaviour, written down) ---------------------------------------------------------


def test_a_token_is_valid_through_its_exp_second_and_expires_one_second_later(frozen_clock):
    exp = 2_000_000_000
    token = signed_token({"user_id": str(uuid_of(ALICE)), "exp": exp})

    frozen_clock(exp - 1)
    assert decode_access_token(token) == uuid_of(ALICE)
    frozen_clock(exp)  # the boundary is inclusive: a "30 minute" token can live up to a second longer
    assert decode_access_token(token) == uuid_of(ALICE)
    frozen_clock(exp + 1)
    assert decode_access_token(token) is None


@pytest.mark.parametrize("field", ["name", "phone", "address"])
@pytest.mark.parametrize(
    ("value", "accepted"),
    [("OMITTED", True), (None, True), ("", False), ("   ", False)],
    ids=["omitted", "null", "empty", "blank"],
)
async def test_optional_profile_fields_may_be_omitted_or_null_but_not_empty_or_blank(async_client, field, value, accepted):
    extra = {} if value == "OMITTED" else {field: value}

    response = await register(async_client, **extra)

    assert response.is_success is accepted


async def test_the_profile_name_limit_counts_characters_not_bytes(async_client):
    assert (await register(async_client, name="\U0001F600" * 80)).status_code == 201  # 320 bytes, 80 characters
    assert not (await register(async_client, email="otro@example.com", name="\U0001F600" * 81)).is_success


@pytest.mark.parametrize(("password", "accepted"), [("\U0001F600" * 4, False), ("\U0001F600" * 8, True)], ids=["4-emoji", "8-emoji"])
async def test_the_password_minimum_counts_characters_not_bytes(async_client, password, accepted):
    response = await register(async_client, password=password)  # 4 emoji are 16 bytes but only 4 characters

    assert response.is_success is accepted


# --- FAILURE MODES (weaknesses the probes exposed; each waits for a decision) -------------------------------


@pytest.mark.xfail(
    strict=True,
    reason="DECISION PENDING (#2): passwords are not Unicode-normalised, so the same text typed as NFC or NFD "
    "are different passwords. NIST SP 800-63B recommends normalising before hashing.",
)
async def test_the_same_password_typed_in_nfc_or_nfd_logs_in(async_client):
    composed = unicodedata.normalize("NFC", "contraseña-ñandú-é1")
    decomposed = unicodedata.normalize("NFD", composed)
    assert composed != decomposed
    await register(async_client, password=composed)

    assert (await login(async_client, NEW["email"], decomposed)).status_code == 200


@pytest.mark.xfail(
    strict=True,
    reason="DECISION PENDING (#3): an email mixing scripts (Cyrillic 'а') registers as a different account whose "
    "default display name looks identical to an existing one.",
)
async def test_an_email_that_imitates_an_existing_one_with_another_alphabet_is_refused(async_client, users_db):
    response = await register(async_client, email="аlice@example.com")  # Cyrillic а + "lice"

    assert not response.is_success
    assert len(users_db) == 3


@pytest.mark.xfail(
    strict=True,
    reason="DECISION PENDING (#3): a profile's default name is the email's local part and the directory shows it to "
    "every session, so any user learns the local part of everybody's email.",
)
async def test_the_user_directory_does_not_reveal_other_peoples_email_local_parts(async_client):
    entries = (await async_client.get("/users/directory", headers=headers_for(BOB))).json()
    names = {entry["user_id"]: entry["name"] for entry in entries}

    assert names[str(uuid_of(ALICE))] != ALICE.split("@")[0]
    assert names[str(uuid_of(CAROL))] != CAROL.split("@")[0]


@pytest.mark.xfail(
    strict=True,
    reason="DECISION PENDING (#4): ACCESS_TOKEN_EXPIRE_MINUTES passes validation at any size, but from about 4e9 "
    "minutes (year 9999) every login fails with a 500 (OverflowError).",
)
def test_an_absurd_token_lifetime_is_refused_by_the_configuration(monkeypatch):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(10**10))

    with pytest.raises(RuntimeError):
        get_access_token_expire_minutes()


@pytest.mark.xfail(
    strict=True,
    reason="DECISION PENDING (#6): the last character of the signature carries padding bits, so several different "
    "token strings are valid for the same signature. Harmless until tokens are blocked by their text.",
)
def test_a_token_has_exactly_one_valid_textual_form():
    token = signed_token({"user_id": str(uuid_of(ALICE)), "exp": FAR_FUTURE})

    variants = [
        letter for letter in BASE64URL if letter != token[-1] and decode_access_token(token[:-1] + letter) is not None
    ]

    assert variants == []


@pytest.mark.xfail(
    strict=True,
    reason="DECISION PENDING (#7): a POST to a URL with a trailing slash answers 307 with a Location built from the "
    "request, so behind a TLS proxy without trusted forwarded headers credentials could be re-sent over http.",
)
async def test_a_credentials_post_to_a_url_with_a_trailing_slash_is_not_redirected(async_client):
    response = await async_client.post(
        "/auth/login/", data={"username": ALICE, "password": PASSWORD}, follow_redirects=False
    )

    assert response.status_code != 307
