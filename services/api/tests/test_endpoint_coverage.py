"""The guarantee behind ticket AUTH-088: every endpoint of the authentication API has at least one happy-path test, one edge-case
test and one failure-mode test, and it stays that way.

The authentication API is every operation under ``/auth`` (log in, who am I) and ``/users`` (sign up, and managing accounts).
``AUTH_ENDPOINT_TESTS`` names, for each one, a test per level. Three checks keep it honest:

* every operation the app really exposes is in the table, so a new endpoint cannot be merged without choosing its tests;
* nothing in the table is an endpoint that no longer exists;
* every test named in the table exists, so renaming or deleting one cannot silently leave an endpoint uncovered.

When this fails after adding an endpoint, add its three tests (see ``test_login.py`` for the layout) and list them here.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

from main import app

TESTS = Path(__file__).parent
AUTH_PREFIXES = ("/auth", "/users")
LEVELS = ("happy", "edge", "failure")

AUTH_ENDPOINT_TESTS: dict[tuple[str, str], dict[str, list[str]]] = {
    ("POST", "/auth/login"): {
        "happy": ["test_valid_credentials_start_a_session_for_that_user_and_nobody_else"],
        "edge": ["test_the_email_is_matched_ignoring_case_and_surrounding_spaces"],
        "failure": ["test_unknown_email_wrong_password_and_deactivated_account_look_exactly_alike"],
    },
    ("GET", "/auth/me"): {
        "happy": ["test_it_returns_the_account_of_the_session_with_its_profile"],
        "edge": ["test_a_missing_profile_is_recreated_once_and_never_duplicated"],
        "failure": ["test_without_a_session_there_is_no_answer_and_no_data"],
    },
    ("POST", "/users"): {
        "happy": ["test_a_new_account_is_created_active_with_the_user_role_and_can_sign_in_at_once"],
        "edge": ["test_the_password_must_be_8_to_72_bytes_without_nul_bytes"],
        "failure": ["test_an_email_that_is_already_registered_is_refused_in_any_spelling"],
    },
    ("GET", "/users"): {
        "happy": ["test_an_admin_lists_every_account"],
        "edge": ["test_the_admin_list_includes_deactivated_accounts_but_the_directory_does_not"],
        "failure": ["test_listing_every_account_is_for_admins_only"],
    },
    ("GET", "/users/directory"): {
        "happy": ["test_any_session_gets_the_directory_of_active_accounts_in_name_order"],
        "edge": ["test_the_directory_is_in_alphabetical_order_whatever_the_capitals"],
        "failure": ["test_every_account_route_needs_a_session_and_changes_nothing_without_one"],
    },
    ("GET", "/users/{user_id}"): {
        "happy": ["test_an_account_reads_its_own_data_and_an_admin_reads_anyones"],
        "edge": ["test_an_unknown_account_is_not_found_for_an_admin_and_forbidden_for_everyone_else"],
        "failure": ["test_an_account_cannot_read_another_and_the_answer_does_not_say_whether_it_exists"],
    },
    ("PUT", "/users/{user_id}"): {
        "happy": ["test_the_owner_changes_their_email_with_the_current_password_and_the_session_survives"],
        "edge": ["test_an_update_with_nothing_in_it_changes_nothing"],
        "failure": ["test_a_wrong_current_password_changes_nothing"],
    },
    ("DELETE", "/users/{user_id}"): {
        "happy": ["test_an_account_deletes_itself_and_the_session_dies_with_it"],
        "edge": ["test_the_email_of_a_deleted_account_can_be_registered_again_as_a_new_account"],
        "failure": ["test_the_last_active_admin_cannot_be_demoted_switched_off_or_deleted"],
    },
}


def exposed_auth_operations() -> set[tuple[str, str]]:
    return {
        (method.upper(), path)
        for path, item in app.openapi()["paths"].items()
        if path.startswith(AUTH_PREFIXES)
        for method in item
    }


def existing_tests() -> set[str]:
    names: set[str] = set()
    for module in TESTS.glob("test_*.py"):
        for node in ast.walk(ast.parse(module.read_text(encoding="utf-8"))):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.startswith("test_"):
                names.add(node.name)
    return names


# --- HAPPY PATH ---------------------------------------------------------------------------------------


def test_the_api_exposes_the_authentication_endpoints_this_table_is_about():
    assert len(exposed_auth_operations()) == 8  # login, me, and the six operations of /users
    assert {path for _, path in exposed_auth_operations()} >= {"/auth/login", "/auth/me", "/users", "/users/{user_id}"}


def test_every_authentication_endpoint_has_a_test_for_each_level():
    gaps = {
        f"{method} {path}": [level for level in LEVELS if not AUTH_ENDPOINT_TESTS.get((method, path), {}).get(level)]
        for method, path in sorted(exposed_auth_operations())
    }

    assert {endpoint: missing for endpoint, missing in gaps.items() if missing} == {}


# --- EDGE CASES --------------------------------------------------------------------------------------


@pytest.mark.parametrize("level", LEVELS)
def test_each_level_names_real_tests(level):
    available = existing_tests()

    missing = [name for tests in AUTH_ENDPOINT_TESTS.values() for name in tests[level] if name not in available]

    assert missing == []


def test_the_three_levels_of_an_endpoint_are_three_different_tests():
    for endpoint, tests in AUTH_ENDPOINT_TESTS.items():
        names = [name for level in LEVELS for name in tests[level]]
        assert len(names) == len(set(names)), f"{endpoint} reuses one test for two levels"


# --- FAILURE MODES -----------------------------------------------------------------------------------


def test_an_endpoint_added_without_tests_is_caught():
    new_endpoints = exposed_auth_operations() - set(AUTH_ENDPOINT_TESTS)

    assert new_endpoints == set(), f"add happy/edge/failure tests for {sorted(new_endpoints)} and list them in AUTH_ENDPOINT_TESTS"


def test_a_table_entry_for_an_endpoint_that_no_longer_exists_is_caught():
    stale = set(AUTH_ENDPOINT_TESTS) - exposed_auth_operations()

    assert stale == set(), f"{sorted(stale)} are no longer exposed: remove them from AUTH_ENDPOINT_TESTS"


def test_an_empty_level_is_not_accepted():
    empty = [(endpoint, level) for endpoint, tests in AUTH_ENDPOINT_TESTS.items() for level in LEVELS if not tests.get(level)]

    assert empty == []
