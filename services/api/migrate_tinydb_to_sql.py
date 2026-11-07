"""One-time migration: copy every TinyDB-backed entity (services/api/db.json)
into its new SQL (Postgres/Supabase) table, preserving IDs exactly.

Must run, in order:
  1. supabase/migrations/20261106120000_create_users_profiles_tokens_suppliers_incidents_records.sql
  2. THIS SCRIPT (uv run migrate-tinydb)
  3. supabase/migrations/20261106130000_add_fk_retrofit_inbound_stock_stock_exits.sql

IDs for `users` and `suppliers` are inserted with their exact former
TinyDB doc_id (not left to autoincrement) — this is what keeps
`InboundStock.supplier_id`/`InboundStock.user_uuid`/`StockExit.user_uuid`
(which already store these as bare ints, with no FK before this
migration) meaningful, and what keeps JWTs issued before the cutover
valid afterward (the JWT `sub` claim is `str(old TinyDB doc_id)`).
`incidents`/`records`/`candidate_notes` already used a string UUID as
their own `id` field in TinyDB, so those are inserted as-is.

After loading users/suppliers, this script re-synchronizes the
`users_id_seq`/`suppliers_id_seq` sequences (created by migration #1) so
new application inserts continue from the right next id — this must
happen AFTER the data load, which is why migration #1 only creates the
sequence/default once (at migration time, when the tables are still
empty) and this script re-runs `setval` itself afterward.

Safety: aborts (without writing anything) if a destination table already
has rows, rather than risking a silent double-insert — the explicit PK
values would conflict anyway, but this gives an early, clear error
instead of a half-completed run.

Usage (via uv):
    uv run migrate-tinydb
"""

from __future__ import annotations

import sys
from datetime import date, datetime

from sqlalchemy import func, select, text
from sqlmodel import Session

from app.core.database import engine, get_tinydb
from app.models.candidate_storage import candidate_notes_table, records_table
from app.models.incident_storage import incidents_table
from app.models.password_reset_token_storage import password_reset_tokens_table
from app.models.profile_storage import profiles_table
from app.models.supplier_storage import suppliers_table
from app.models.user_storage import users_table


def _parse_dt(value: str | None) -> datetime | None:
    """Every timestamp in db.json was stored via `datetime.isoformat()` —
    parse it back into a real `datetime` rather than relying on the DB
    driver to coerce a bare string."""
    return datetime.fromisoformat(value) if value else None


def _parse_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def _table_is_empty(db: Session, table) -> bool:
    count = db.execute(select(func.count()).select_from(table)).scalar_one()
    return count == 0


def _migrate_table(db: Session, docs: list[dict], table, *, label: str, id_field: str = "id") -> int:
    if not docs:
        print(f"  ⏭  {label}: nothing to migrate (TinyDB table is empty).")
        return 0

    if not _table_is_empty(db, table):
        print(
            f"❌ Destination table '{table.name}' already has rows — aborting before "
            "writing anything, to avoid a partial/duplicate migration. If this is "
            "intentional (re-running on an already-migrated environment), clear the "
            "destination table first.",
            file=sys.stderr,
        )
        sys.exit(1)

    db.execute(table.insert(), docs)
    db.commit()
    print(f"  ✅ {label}: migrated {len(docs)} row(s).")
    return len(docs)


def _reseed_sequence(db: Session, table_name: str, sequence_name: str) -> None:
    db.execute(text(f"SELECT setval('{sequence_name}', COALESCE((SELECT MAX(id) FROM {table_name}), 1))"))
    db.commit()


def migrate() -> None:
    tinydb = get_tinydb()

    users_docs = [
        {
            "id": doc.doc_id,
            "email": doc["email"],
            "hashed_password": doc["hashed_password"],
            "is_active": doc.get("is_active", True),
            "role": doc["role"],
            "created_at": _parse_dt(doc["created_at"]),
        }
        for doc in tinydb.table("users").all()
    ]
    profiles_docs = [
        {
            "user_id": doc["user_id"],
            "name": doc.get("name"),
            "phone": doc.get("phone"),
            "address": doc.get("address"),
        }
        for doc in tinydb.table("profiles").all()
    ]
    tokens_docs = [
        {
            "user_id": doc["user_id"],
            "token_hash": doc["token_hash"],
            "created_at": _parse_dt(doc["created_at"]),
            "expires_at": _parse_dt(doc["expires_at"]),
            "used_at": _parse_dt(doc.get("used_at")),
        }
        for doc in tinydb.table("password_reset_tokens").all()
    ]
    suppliers_docs = [
        {
            "id": doc.doc_id,
            "full_name": doc["full_name"],
            "email": doc["email"],
            "phone": doc["phone"],
            "country": doc["country"],
            "city": doc["city"],
            "favorite_location": doc.get("favorite_location"),
            "dietary_preferences": doc.get("dietary_preferences", []),
            "how_did_you_find_us": doc.get("how_did_you_find_us"),
            "date_of_birth": _parse_date(doc["date_of_birth"]),
            "accepts_terms": doc["accepts_terms"],
            "wants_email_offers": doc.get("wants_email_offers", False),
            "product_category": doc.get("product_category"),
            "rate": doc.get("rate"),
            "status": doc.get("status", "active"),
            "created_at": _parse_dt(doc["created_at"]),
            "updated_at": _parse_dt(doc["updated_at"]),
        }
        for doc in tinydb.table("suppliers").all()
    ]
    incidents_docs = [
        {
            "id": doc["id"],
            "title": doc["title"],
            "description": doc["description"],
            "category": doc["category"],
            "status": doc["status"],
            "origin": doc["origin"],
            "branch": doc["branch"],
            "customer_id": doc.get("customer_id"),
            "satisfaction_score": doc.get("satisfaction_score"),
            "reporter_id": doc.get("reporter_id"),
            "incident_date": _parse_date(doc.get("incident_date")),
            "created_at": _parse_dt(doc["created_at"]),
            "updated_at": _parse_dt(doc["updated_at"]),
        }
        for doc in tinydb.table("incidents").all()
    ]
    records_docs = [
        {
            "id": doc["id"],
            "full_name": doc["full_name"],
            "email": doc["email"],
            "phone": doc.get("phone"),
            "position": doc["position"],
            "linkedin_url": doc.get("linkedin_url"),
            "cv_url": doc.get("cv_url"),
            "status": doc.get("status", "received"),
            "stage": doc.get("stage", "pending"),
            "experience_years": doc["experience_years"],
            "applied_at": _parse_dt(doc["applied_at"]),
            "updated_at": _parse_dt(doc["updated_at"]),
        }
        for doc in tinydb.table("records").all()
    ]
    notes_docs = [
        {
            "id": doc["id"],
            "record_id": doc["record_id"],
            "content": doc["content"],
            "created_at": _parse_dt(doc["created_at"]),
        }
        for doc in tinydb.table("candidate_notes").all()
    ]

    with Session(engine) as db:
        counts = {}
        # Dependency order: users before profiles/password_reset_tokens
        # (FK); records before candidate_notes (FK). suppliers/incidents
        # are independent.
        counts["users"] = _migrate_table(db, users_docs, users_table, label="users")
        counts["profiles"] = _migrate_table(db, profiles_docs, profiles_table, label="profiles")
        counts["password_reset_tokens"] = _migrate_table(
            db, tokens_docs, password_reset_tokens_table, label="password_reset_tokens"
        )
        counts["suppliers"] = _migrate_table(db, suppliers_docs, suppliers_table, label="suppliers")
        counts["incidents"] = _migrate_table(db, incidents_docs, incidents_table, label="incidents")
        counts["records"] = _migrate_table(db, records_docs, records_table, label="records")
        counts["candidate_notes"] = _migrate_table(db, notes_docs, candidate_notes_table, label="candidate_notes")

        if counts["users"] or counts["suppliers"]:
            _reseed_sequence(db, "users", "users_id_seq")
            _reseed_sequence(db, "suppliers", "suppliers_id_seq")
            print("  🔄 Re-synced users_id_seq/suppliers_id_seq to continue after the migrated ids.")

    print()
    print("─" * 50)
    print("  📊 Summary")
    for label, count in counts.items():
        print(f"     {label:<22}: {count}")
    print("─" * 50)


def main() -> None:
    """Entry point for `uv run migrate-tinydb`."""
    print("🚚 Migrating TinyDB (services/api/db.json) entities into SQL …")
    print()
    migrate()
    print("\nDone! ✨")


if __name__ == "__main__":
    main()
