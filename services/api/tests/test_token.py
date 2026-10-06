"""Access tokens as a unit: issuing, expiry, decoding and the secret / lifetime settings. No HTTP here:
what a token gets you over the API is in ``test_session.py``.

Layout shared by every auth test module: HAPPY PATH, EDGE CASES, FAILURE MODES; Arrange / Act / Assert;
assertions about business rules (whose session a token is, when it stops working, what is ever accepted).

Time-dependent tests use the ``clock`` fixture (conftest): it moves the clock the JWT library validates against,
so a token's real expiry is crossed without sleeping.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from jose import jwt

from auth.security import create_access_token, decode_access_token
from conftest import ALICE, BOB, FAR_FUTURE, jwt_payload, jwt_segment, signed_token, uuid_of
from core.config import (
    DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_ALGORITHM,
    MIN_SECRET_KEY_LENGTH,
    get_access_token_expire_minutes,
    get_jwt_secret,
)


def valid_claims(**overrides) -> dict:
    return {"user_id": str(uuid4()), "exp": FAR_FUTURE} | overrides


def now() -> float:
    return datetime.now(timezone.utc).timestamp()


# --- HAPPY PATH ---------------------------------------------------------------------------------------


@pytest.mark.parametrize("as_text", [False, True], ids=["uuid", "str"])
def test_a_token_identifies_the_account_it_was_issued_for(as_text):
    account = uuid4()

    token = create_access_token(str(account) if as_text else account)

    assert decode_access_token(token) == account


def test_a_token_carries_only_the_account_id_and_an_expiry(monkeypatch):
    monkeypatch.delenv("ACCESS_TOKEN_EXPIRE_MINUTES", raising=False)
    account = uuid4()

    claims = jwt.decode(create_access_token(account), get_jwt_secret(), algorithms=[JWT_ALGORITHM])

    assert set(claims) == {"user_id", "exp"}  # no email, no role, no hash: permissions are read live
    assert claims["user_id"] == str(account)
    assert DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES == 30
    assert claims["exp"] == pytest.approx(now() + 30 * 60, abs=5)


def test_every_account_gets_its_own_token():
    assert create_access_token(uuid_of(ALICE)) != create_access_token(uuid_of(BOB))


def test_a_token_is_signed_with_the_configured_secret_and_algorithm():
    token = create_access_token(uuid_of(ALICE))

    assert jwt.get_unverified_header(token)["alg"] == "HS256"
    assert jwt.decode(token, get_jwt_secret(), algorithms=["HS256"])["user_id"] == str(uuid_of(ALICE))


def test_the_lifetime_is_read_every_time_a_token_is_issued_not_once_at_import(monkeypatch):
    for minutes, expected in (("7", 7 * 60), ("90", 90 * 60)):
        monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", minutes)
        claims = jwt.decode(create_access_token(uuid4()), get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        assert claims["exp"] == pytest.approx(now() + expected, abs=5)

    monkeypatch.delenv("ACCESS_TOKEN_EXPIRE_MINUTES")
    claims = jwt.decode(create_access_token(uuid4()), get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    assert claims["exp"] == pytest.approx(now() + 30 * 60, abs=5)


# --- EDGE CASES --------------------------------------------------------------------------------------


def test_a_token_is_valid_until_its_lifetime_has_passed_and_not_after(clock, monkeypatch):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1")
    account = uuid4()
    token = create_access_token(account)

    clock(55)
    assert decode_access_token(token) == account  # still inside the minute
    clock(65)
    assert decode_access_token(token) is None  # a few seconds past it


def test_the_default_session_lasts_thirty_minutes(clock, monkeypatch):
    monkeypatch.delenv("ACCESS_TOKEN_EXPIRE_MINUTES", raising=False)
    token = create_access_token(uuid_of(ALICE))

    clock(29 * 60)
    assert decode_access_token(token) == uuid_of(ALICE)
    clock(31 * 60)
    assert decode_access_token(token) is None


def test_a_token_keeps_the_lifetime_it_was_issued_with(clock, monkeypatch):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1")
    token = create_access_token(uuid_of(ALICE))

    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120")  # a later configuration change...
    clock(65)

    assert decode_access_token(token) is None  # ...does not stretch a token that is already out


def test_the_expiry_is_an_absolute_instant_whatever_the_servers_timezone(tokyo_timezone, clock, monkeypatch):
    """A naive ``datetime.now()`` would shift ``exp`` by the UTC offset (9 h here): sessions of ten hours."""
    monkeypatch.delenv("ACCESS_TOKEN_EXPIRE_MINUTES", raising=False)
    token = create_access_token(uuid_of(ALICE))

    claims = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    assert claims["exp"] == pytest.approx(now() + 30 * 60, abs=5)
    clock(31 * 60)
    assert decode_access_token(token) is None


def test_a_token_that_is_not_valid_yet_is_rejected_until_its_start_time(clock):
    start = datetime.now(timezone.utc)
    token = signed_token(valid_claims(nbf=start + timedelta(minutes=10), exp=start + timedelta(minutes=30)))

    assert decode_access_token(token) is None
    clock(11 * 60)  # past nbf, before exp
    assert decode_access_token(token) is not None


def test_the_secret_key_from_the_environment_is_used_as_is(monkeypatch):
    key = "k" * MIN_SECRET_KEY_LENGTH
    monkeypatch.setenv("SECRET_KEY", key)

    # ``__wrapped__`` runs the real logic without touching the process-wide cache the other tests sign with
    assert get_jwt_secret.__wrapped__() == key


def test_the_secret_is_stable_within_the_process():
    assert get_jwt_secret() == get_jwt_secret()


@pytest.mark.parametrize(("raw", "minutes"), [(None, 30), ("", 30), ("1", 1), ("45", 45), ("525600", 525600)])
def test_the_token_lifetime_setting_falls_back_to_thirty_minutes_when_unset(monkeypatch, raw, minutes):
    if raw is None:
        monkeypatch.delenv("ACCESS_TOKEN_EXPIRE_MINUTES", raising=False)
    else:
        monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", raw)

    assert get_access_token_expire_minutes() == minutes


# --- FAILURE MODES -----------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "garbage",
    ["", " ", "a", "a.b", "a.b.c", "a.b.c.d", "....", "\x00", "Bearer abc", "ñ" * 40, "a." * 3000, "null", "{}", "[]"],
)
def test_garbage_is_never_a_session(garbage):
    assert decode_access_token(garbage) is None


def test_a_good_token_that_was_tampered_with_is_rejected():
    account, other = uuid4(), uuid4()
    head, payload, signature = create_access_token(account).split(".")
    swapped = jwt_segment(jwt_payload(payload) | {"user_id": str(other)})
    middle = len(signature) // 2  # not the last char: its trailing bits are padding and may not change the bytes
    flipped = signature[:middle] + ("A" if signature[middle] != "A" else "B") + signature[middle + 1 :]

    assert decode_access_token(f"{head}.{payload}.{signature}") == account  # control: untouched is fine
    assert decode_access_token(f"{head}.{swapped}.{signature}") is None  # payload changed, old signature
    assert decode_access_token(f"{head}.{payload}.{flipped}") is None  # signature changed
    assert decode_access_token(f"{head}.{payload}.") is None  # signature removed
    assert decode_access_token(f"{head}.{payload}") is None  # no signature part at all
    assert decode_access_token(f"{head}.{payload}.{signature}.extra") is None
    assert decode_access_token(f"{head}.{payload}.{signature[:-10]}") is None  # truncated


def test_a_token_signed_with_another_key_is_rejected():
    claims = valid_claims()

    assert decode_access_token(signed_token(claims)) is not None  # control
    assert decode_access_token(signed_token(claims, key="another-secret-key-of-32-characters!!")) is None


@pytest.mark.parametrize("algorithm", ["HS384", "HS512"])
def test_other_hmac_algorithms_are_refused_even_with_the_right_key(algorithm):
    assert decode_access_token(signed_token(valid_claims(), algorithm=algorithm)) is None


@pytest.mark.parametrize("alg", ["none", "None", "NONE", "nOnE", ""])
def test_unsigned_tokens_are_refused_whatever_they_claim(alg):
    payload = jwt_segment({"user_id": str(uuid4()), "exp": FAR_FUTURE})

    assert decode_access_token(f"{jwt_segment({'alg': alg, 'typ': 'JWT'})}.{payload}.") is None
    assert decode_access_token(f"{jwt_segment({'alg': alg, 'typ': 'JWT'})}.{payload}") is None


@pytest.mark.parametrize(
    "overrides",
    [
        {"exp": 0},
        {"exp": -5},
        {"exp": True},
        {"exp": datetime.now(timezone.utc) - timedelta(seconds=1)},
        {"user_id": None},
        {"user_id": ""},
        {"user_id": 1},
        {"user_id": True},
        {"user_id": 10**31},  # 32 digits: str() of it would parse as a UUID, but it is not a string
        {"user_id": ["00000000-0000-0000-0000-000000000000"]},
        {"user_id": {"id": "x"}},
        {"user_id": "not-a-uuid"},
        {"user_id": "alice@example.com"},  # an email is not an identity
    ],
    ids=["exp-0", "exp-negative", "exp-bool", "expired", "uid-null", "uid-empty", "uid-int", "uid-bool",
         "uid-32-digit-int", "uid-list", "uid-dict", "uid-not-uuid", "uid-email"],
)
def test_a_signed_token_with_wrong_claims_is_rejected(overrides):
    assert decode_access_token(signed_token(valid_claims(**overrides))) is None


@pytest.mark.parametrize("missing", ["exp", "user_id"])
def test_both_claims_are_required(missing):
    claims = valid_claims()
    del claims[missing]

    assert decode_access_token(signed_token(claims)) is None


@pytest.mark.parametrize("exp", [None, [1]], ids=["exp-null", "exp-list"])
def test_a_non_numeric_exp_is_a_rejected_token_not_a_crash(exp):
    assert decode_access_token(signed_token(valid_claims(exp=exp))) is None


@pytest.mark.parametrize("length", [1, 8, MIN_SECRET_KEY_LENGTH - 1])
def test_a_too_short_secret_key_is_refused_rather_than_accepted(monkeypatch, length):
    monkeypatch.setenv("SECRET_KEY", "k" * length)

    with pytest.raises(RuntimeError, match=str(MIN_SECRET_KEY_LENGTH)):
        get_jwt_secret.__wrapped__()


def test_without_a_secret_key_a_strong_random_one_is_used_and_a_warning_is_logged(monkeypatch, caplog):
    monkeypatch.delenv("SECRET_KEY", raising=False)

    with caplog.at_level(logging.WARNING, logger="core.config"):
        first, second = get_jwt_secret.__wrapped__(), get_jwt_secret.__wrapped__()

    assert len(first) >= MIN_SECRET_KEY_LENGTH and first != second  # random per call (the real one is cached)
    assert "SECRET_KEY is not set" in caplog.text


@pytest.mark.parametrize("bad", ["0", "-1", "-30", "abc", "1.5", "30m", "  ", "NaN"])
def test_a_nonsensical_token_lifetime_is_refused_not_turned_into_a_default(monkeypatch, bad):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", bad)

    with pytest.raises(RuntimeError, match="positive integer"):
        get_access_token_expire_minutes()
