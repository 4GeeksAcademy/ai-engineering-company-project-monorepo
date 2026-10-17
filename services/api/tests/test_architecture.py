"""Architecture guard: User and Profile live only in TinyDB, before and after Supabase/PostgreSQL.

Other modules (inventory, ...) may get PostgreSQL tables, but those only store the TinyDB
``User.id`` in a plain ``user_uuid`` column. Nothing about users or profiles goes to SQL.
These checks read the source, so they keep guarding the rule once SQL code exists.
"""

from __future__ import annotations

import re
from pathlib import Path

from tinydb import TinyDB

from core.config import get_profiles_db_path, get_users_db_path
from profiles import service as profiles_service
from users import service as users_service

REPO = Path(__file__).resolve().parents[3]
API = REPO / "services" / "api"
SKIP = {".venv", "node_modules", ".git", "__pycache__", "tests"}


def _files(root: Path, suffixes: tuple[str, ...]):
    for path in root.rglob("*"):
        if path.is_file() and path.suffix in suffixes and not SKIP & set(path.relative_to(root).parts):
            yield path


# A table or model called user(s)/profile(s): SQL DDL, SQLModel/SQLAlchemy ``table=True`` classes,
# ``__tablename__`` and supabase-py ``.table("users")`` calls.
_FORBIDDEN = [
    (re.compile(r"create\s+table\s+(if\s+not\s+exists\s+)?([\w\"]+\.)?\"?(users?|profiles?)\"?\b", re.I), "CREATE TABLE"),
    (re.compile(r"class\s+(User|Profile)\w*\s*\([^)]*\btable\s*=\s*True", re.S), "SQLModel table class"),
    (re.compile(r"__tablename__\s*=\s*['\"](users?|profiles?)['\"]", re.I), "__tablename__"),
    (re.compile(r"\.(table|from_)\(\s*['\"](users?|profiles?)['\"]\s*\)", re.I), "supabase .table()"),
]


def test_no_sql_table_or_model_for_users_or_profiles_anywhere_in_the_repo():
    offenders = []
    for root in (REPO / "services", REPO / "infra", REPO / "packages"):
        if not root.exists():
            continue
        for path in _files(root, (".py", ".sql")):
            text = path.read_text(encoding="utf-8", errors="ignore")
            offenders += [f"{path.relative_to(REPO)}: {what}" for pattern, what in _FORBIDDEN if pattern.search(text)]
    assert offenders == []


def test_the_users_and_profiles_packages_do_not_depend_on_a_sql_stack():
    banned = re.compile(r"^\s*(from|import)\s+(sqlmodel|sqlalchemy|supabase|psycopg2?|asyncpg|postgrest)\b", re.M)
    offenders = []
    for package in ("users", "profiles", "auth"):
        for path in _files(API / package, (".py",)):
            if banned.search(path.read_text(encoding="utf-8")):
                offenders.append(str(path.relative_to(REPO)))
    assert offenders == []


def test_users_and_profiles_are_stored_in_tinydb_files_inside_their_own_packages():
    assert get_users_db_path() == API / "users" / "db.json"
    assert get_profiles_db_path() == API / "profiles" / "db.json"
    assert isinstance(users_service.get_db(), TinyDB) and isinstance(profiles_service.get_db(), TinyDB)


def test_user_and_profile_documents_never_gain_sql_style_foreign_keys(users_db, profiles_db):
    """Other modules point at users with ``user_uuid``; the reverse never happens: the TinyDB
    documents know nothing about inventory or any other SQL table."""
    user_keys = set(users_db.all()[0])
    profile_keys = set(profiles_db.all()[0])
    assert user_keys == {"id", "email", "hashed_password", "is_active", "role", "created_at"}
    assert profile_keys == {"id", "user_id", "name", "contact_email", "phone", "address"}
