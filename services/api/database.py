"""Data access: TinyDB for suppliers, incidents, users, profiles and password reset tokens,
and a SQLModel engine (Supabase Postgres) for the inventory.

Routes only talk to the repositories, so moving to Postgres later means
rewriting this module without touching the API layer. Documents are stored as
JSON (dates and datetimes in ISO 8601) and turned back into models on read.
The two databases are independent: the inventory keeps only the TinyDB user id
(`user_uuid`), never a copy of the user.
"""

from __future__ import annotations

import json
import os
import threading
from collections import Counter
from collections.abc import Iterator
from functools import lru_cache
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path

from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine
from tinydb import Query, TinyDB
from tinydb.table import Document

import config

from cache import TTLCache
from incident_models import Incident, IncidentRecord, IncidentSummary
from models import Category, Country, Supplier, SupplierCreate, SupplierStatus
from nexova_shared.incidents import Branch, IncidentCategory, IncidentOrigin, IncidentStatus, can_transition
from user_models import PasswordResetToken, Profile, User

API_ROOT = Path(__file__).resolve().parent
DEFAULT_DB_PATH = API_ROOT / "data" / "suppliers.json"
DB_PATH_ENV = "SUPPLIERS_DB_PATH"
DEFAULT_USERS_DB_PATH = API_ROOT / "data" / "users.json"
USERS_DB_PATH_ENV = "USERS_DB_PATH"
DEFAULT_INCIDENTS_DB_PATH = API_ROOT / "data" / "incidents.json"
INCIDENTS_DB_PATH_ENV = "INCIDENTS_DB_PATH"

# Incident reads are O(n) (every document is validated into a model, or counted). Writes
# in this process invalidate at once, so the TTL only bounds staleness caused by writers
# this cache cannot see (another worker, scripts/seed_*.py). See CACHING_REPORT.md.
INCIDENT_LIST_TTL_SECONDS = 30
INCIDENT_SUMMARY_TTL_SECONDS = 60


def db_path_from_env() -> Path:
    return Path(os.environ.get(DB_PATH_ENV) or DEFAULT_DB_PATH)


def users_db_path_from_env() -> Path:
    return Path(os.environ.get(USERS_DB_PATH_ENV) or DEFAULT_USERS_DB_PATH)


def incidents_db_path_from_env() -> Path:
    return Path(os.environ.get(INCIDENTS_DB_PATH_ENV) or DEFAULT_INCIDENTS_DB_PATH)


class DatabaseFileError(RuntimeError):
    """A TinyDB file cannot be opened or is not valid JSON."""


def open_db(path: Path | str) -> TinyDB:
    """Open a TinyDB file and read it once, so a corrupt or unreadable file fails
    here with its name instead of as a bare JSONDecodeError on the first request."""
    db = TinyDB(path, create_dirs=True, encoding="utf-8", ensure_ascii=False, indent=2)
    try:
        db.tables()
    except json.JSONDecodeError as error:
        db.close()
        raise DatabaseFileError(
            f"{path} is not valid JSON (line {error.lineno}); restore it from a backup or remove it to start empty"
        ) from error
    except UnicodeDecodeError as error:
        db.close()
        raise DatabaseFileError(f"{path} is not UTF-8 text") from error
    return db


def _now() -> str:
    return datetime.now(UTC).isoformat()


class SupplierRepository:
    def __init__(self, path: Path | str) -> None:
        self._db = open_db(path)
        self._table = self._db.table("suppliers")
        # TinyDB is not thread-safe and FastAPI runs sync routes in a thread pool.
        self._lock = threading.Lock()

    def close(self) -> None:
        self._db.close()

    @staticmethod
    def _to_model(doc: Document) -> Supplier:
        return Supplier.model_validate({**doc, "id": doc.doc_id})

    def count(self) -> int:
        with self._lock:
            return len(self._table)

    def exists_name(self, name: str) -> bool:
        with self._lock:
            return self._table.contains(Query().name == name)

    def list(self, country: Country | None = None, category: Category | None = None) -> list[Supplier]:
        supplier = Query()
        conditions = []
        if country is not None:
            conditions.append(supplier.country == country.value)
        if category is not None:
            conditions.append(supplier.categories.any([category.value]))
        with self._lock:
            if not conditions:
                docs = self._table.all()
            else:
                condition = conditions[0]
                for extra in conditions[1:]:
                    condition &= extra
                docs = self._table.search(condition)
        return [self._to_model(doc) for doc in docs]

    def get(self, supplier_id: int) -> Supplier | None:
        with self._lock:
            doc = self._table.get(doc_id=supplier_id)
        return self._to_model(doc) if doc else None

    def create(self, data: SupplierCreate) -> Supplier:
        record = {**data.model_dump(mode="json"), "updated_at": _now()}
        with self._lock:
            doc_id = self._table.insert(record)
            doc = self._table.get(doc_id=doc_id)
        return self._to_model(doc)

    def _update(self, supplier_id: int, fields: dict) -> Supplier | None:
        with self._lock:
            if not self._table.contains(doc_id=supplier_id):
                return None
            self._table.update(fields, doc_ids=[supplier_id])
            doc = self._table.get(doc_id=supplier_id)
        return self._to_model(doc)

    def update_rate(self, supplier_id: int, monthly_rate: float) -> Supplier | None:
        return self._update(supplier_id, {"monthly_rate": monthly_rate, "updated_at": _now()})

    def update_status(self, supplier_id: int, status: SupplierStatus) -> Supplier | None:
        return self._update(supplier_id, {"status": status.value})

    def delete(self, supplier_id: int) -> bool:
        with self._lock:
            # TinyDB raises KeyError when removing an unknown doc_id.
            if not self._table.contains(doc_id=supplier_id):
                return False
            self._table.remove(doc_ids=[supplier_id])
            return True


class SourceIdAlreadyExists(Exception):
    pass


class InvalidStatusTransition(Exception):
    def __init__(self, current: IncidentStatus, new: IncidentStatus) -> None:
        super().__init__(f"{current} -> {new}")
        self.current = current
        self.new = new


class IncidentRepository:
    """Incidents in their own TinyDB file, keyed by doc_id.

    `source_id` (the CSV ticket_id) is unique when set; the check and the insert
    happen under one lock. Status changes are checked against the lifecycle
    under the same lock, so two requests cannot both move an incident.
    """

    def __init__(self, path: Path | str) -> None:
        self._db = open_db(path)
        self._table = self._db.table("incidents")
        self._lock = threading.Lock()
        # Incidents are shared by every authenticated user (no per-user filtering), so keys are only the filters.
        self._list_cache: TTLCache[list[Incident]] = TTLCache("incident_list", INCIDENT_LIST_TTL_SECONDS)
        self._summary_cache: TTLCache[IncidentSummary] = TTLCache("incident_summary", INCIDENT_SUMMARY_TTL_SECONDS)

    def close(self) -> None:
        self._db.close()

    @staticmethod
    def _to_model(doc: Document) -> Incident:
        return Incident.model_validate({**doc, "id": doc.doc_id})

    def list(
        self,
        status: IncidentStatus | None = None,
        origin: IncidentOrigin | None = None,
        branch: Branch | None = None,
        category: IncidentCategory | None = None,
    ) -> list[Incident]:
        """Incidents matching every given filter, newest first (cached per filter combination)."""
        key = (status, origin, branch, category)
        return self._list_cache.get_or_load(key, lambda: self._list_uncached(status, origin, branch, category))

    def _list_uncached(
        self,
        status: IncidentStatus | None,
        origin: IncidentOrigin | None,
        branch: Branch | None,
        category: IncidentCategory | None,
    ) -> list[Incident]:
        filters = {"status": status, "origin": origin, "branch": branch, "category": category}
        wanted = {field: value.value for field, value in filters.items() if value is not None}
        with self._lock:
            docs = self._table.all()
        incidents = [self._to_model(doc) for doc in docs if all(doc.get(field) == value for field, value in wanted.items())]
        return sorted(incidents, key=lambda incident: (incident.created_at, incident.id), reverse=True)

    def get(self, incident_id: int) -> Incident | None:
        with self._lock:
            doc = self._table.get(doc_id=incident_id)
        return self._to_model(doc) if doc else None

    def exists_source(self, source_id: str) -> bool:
        with self._lock:
            return self._table.contains(Query().source_id == source_id)

    def create(self, record: IncidentRecord) -> Incident:
        """Insert a validated record. Raises SourceIdAlreadyExists for a repeated source_id."""
        with self._lock:
            if record.source_id is not None and self._table.contains(Query().source_id == record.source_id):
                raise SourceIdAlreadyExists(record.source_id)
            doc_id = self._table.insert(record.model_dump(mode="json"))
            doc = self._table.get(doc_id=doc_id)
            self._invalidate_caches()
        return self._to_model(doc)

    def create_many(self, records: list[IncidentRecord]) -> int:
        """Insert many validated records in one write (TinyDB rewrites its file per insert). For seeding."""
        with self._lock:
            self._table.insert_multiple(record.model_dump(mode="json") for record in records)
            self._invalidate_caches()
        return len(records)

    def _invalidate_caches(self) -> None:
        # Called under self._lock, after the write: a reader that loaded before it cannot store its result.
        self._list_cache.invalidate()
        self._summary_cache.invalidate()

    def update_status(self, incident_id: int, status: IncidentStatus) -> Incident | None:
        """Move the incident to `status` and touch updated_at. None if it does not exist.

        Raises InvalidStatusTransition if the lifecycle does not allow the change.
        """
        with self._lock:
            doc = self._table.get(doc_id=incident_id)
            if doc is None:
                return None
            current = IncidentStatus(doc["status"])
            if not can_transition(current, status):
                raise InvalidStatusTransition(current, status)
            self._table.update({"status": status.value, "updated_at": _now()}, doc_ids=[incident_id])
            doc = self._table.get(doc_id=incident_id)
            self._invalidate_caches()
        return self._to_model(doc)

    def summary(self) -> IncidentSummary:
        """Totals by status, category, origin and branch (cached)."""
        return self._summary_cache.get_or_load("all", self._summary_uncached)

    def _summary_uncached(self) -> IncidentSummary:
        with self._lock:
            docs = self._table.all()

        def totals(field: str, values: type[StrEnum]) -> dict:
            counts = Counter(doc.get(field) for doc in docs)
            return {value: counts[value.value] for value in values}

        return IncidentSummary(
            total=len(docs),
            by_status=totals("status", IncidentStatus),
            by_category=totals("category", IncidentCategory),
            by_origin=totals("origin", IncidentOrigin),
            by_branch=totals("branch", Branch),
        )


class EmailAlreadyRegistered(Exception):
    pass


class UserRepository:
    """Users, their 1:1 profiles and password reset tokens, in tables of the same TinyDB file.

    All tables share one lock, so creating or deleting a user together with its
    profile happens as a single step no other request can interleave with.
    Records are keyed by their own `id` (uuid4 string), not by TinyDB's doc_id.
    """

    def __init__(self, path: Path | str) -> None:
        self._db = open_db(path)
        self._users = self._db.table("users")
        self._profiles = self._db.table("profiles")
        self._reset_tokens = self._db.table("password_reset_tokens")
        self._lock = threading.Lock()

    def close(self) -> None:
        self._db.close()

    def get_user(self, user_id: str) -> User | None:
        with self._lock:
            doc = self._users.get(Query().id == user_id)
        return User.model_validate(doc) if doc else None

    def get_user_by_email(self, email: str) -> User | None:
        with self._lock:
            doc = self._users.get(Query().email == email)
        return User.model_validate(doc) if doc else None

    def list_users(self) -> list[User]:
        with self._lock:
            docs = self._users.all()
        return [User.model_validate(doc) for doc in docs]

    def create_user_with_profile(self, user: User, profile: Profile) -> User:
        with self._lock:
            if self._users.contains(Query().email == user.email):
                raise EmailAlreadyRegistered(user.email)
            self._users.insert(user.model_dump(mode="json"))
            try:
                self._profiles.insert(profile.model_dump(mode="json"))
            except Exception:
                self._users.remove(Query().id == user.id)
                raise
        return user

    def update_user(self, user_id: str, fields: dict) -> User | None:
        record = Query()
        with self._lock:
            if "email" in fields and self._users.contains((record.email == fields["email"]) & (record.id != user_id)):
                raise EmailAlreadyRegistered(fields["email"])
            if not self._users.update(fields, record.id == user_id):
                return None
            doc = self._users.get(record.id == user_id)
        return User.model_validate(doc)

    def delete_user_with_profile(self, user_id: str) -> bool:
        with self._lock:
            removed = self._users.remove(Query().id == user_id)
            self._profiles.remove(Query().user_id == user_id)
        return bool(removed)

    def get_profile(self, user_id: str) -> Profile | None:
        with self._lock:
            doc = self._profiles.get(Query().user_id == user_id)
        return Profile.model_validate(doc) if doc else None

    def upsert_profile(self, profile: Profile) -> Profile:
        """Write the profile of `profile.user_id`, keeping at most one per user."""
        with self._lock:
            self._profiles.upsert(profile.model_dump(mode="json"), Query().user_id == profile.user_id)
        return profile

    def _invalidate_reset_tokens(self, user_id: str, now: str) -> int:
        record = Query()
        return len(self._reset_tokens.update({"used_at": now}, (record.user_id == user_id) & (record.used_at == None)))  # noqa: E711

    def add_reset_token(self, token: PasswordResetToken) -> None:
        """Store a new reset token, invalidating any the user still had pending."""
        with self._lock:
            self._invalidate_reset_tokens(token.user_id, _now())
            self._reset_tokens.insert(token.model_dump(mode="json"))

    def consume_reset_token(self, jti: str, user_id: str) -> bool:
        """Mark the token used if it exists, belongs to the user, is unused and unexpired.

        Check and update happen under one lock, so two requests can never spend the same token.
        """
        record = Query()
        with self._lock:
            doc = self._reset_tokens.get(record.jti == jti)
            if doc is None:
                return False
            token = PasswordResetToken.model_validate(doc)
            now = datetime.now(UTC)
            if token.user_id != user_id or token.used_at is not None or token.expires_at <= now:
                return False
            self._reset_tokens.update({"used_at": now.isoformat()}, record.jti == jti)
        return True

    def invalidate_reset_tokens(self, user_id: str) -> int:
        """Spend every pending reset token of the user. Returns how many there were."""
        with self._lock:
            return self._invalidate_reset_tokens(user_id, _now())

    def get_reset_token(self, jti: str) -> PasswordResetToken | None:
        with self._lock:
            doc = self._reset_tokens.get(Query().jti == jti)
        return PasswordResetToken.model_validate(doc) if doc else None


# --- Inventory: SQLModel engine on Supabase (Postgres) -------------------------------------------


@lru_cache
def get_engine() -> Engine:
    """The process-wide engine, built on first use from DATABASE_URL.

    Supabase's transaction pooler (port 6543) already pools connections, so the
    local pool stays small; `pool_pre_ping` drops connections the pooler closed.
    SQL is never echoed (the URL holds the password). SQLite URLs are only for tests.
    """
    url = config.database_url()
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    # SQLAlchemy 2.1 picks psycopg v3 for a bare postgresql:// URL; the project ships psycopg2.
    url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=2, echo=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one Session per request, closed when the request ends."""
    with Session(get_engine()) as session:
        yield session


def create_db_and_tables() -> None:
    """Create the inventory tables (and their foreign keys) if they do not exist."""
    import inventory_models  # noqa: F401  (registers the tables on SQLModel.metadata)

    SQLModel.metadata.create_all(get_engine())
