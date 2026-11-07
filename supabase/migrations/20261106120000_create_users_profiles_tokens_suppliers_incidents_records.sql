-- Migrate the remaining TinyDB-backed entities to SQL (Postgres/Supabase).
--
-- Replaces services/api/db.json (a single TinyDB JSON file tracked in
-- git, with no concurrency/durability guarantees, and that resets to its
-- last committed snapshot on every fresh checkout) with 7 real tables:
-- users, profiles, password_reset_tokens, suppliers, incidents, records,
-- candidate_notes.
--
-- Column-by-column source of truth for each table: the corresponding
-- `app/models/*_storage.py` module (plain SQLAlchemy Core `Table`
-- objects, same "migration owns the DDL, the app only reads/writes rows"
-- pattern already used for telemetry_events — see
-- 20261030220000_create_telemetry_events.sql).
--
-- IDs for `users` and `suppliers` are preserved exactly from their former
-- TinyDB doc_id by migrate_tinydb_to_sql.py, which must run AFTER this
-- migration and BEFORE the FK-retrofit migration
-- (20261106130000_add_fk_retrofit_inbound_stock_stock_exits.sql). That is
-- why `users.id`/`suppliers.id` are declared as plain `integer primary
-- key` here (no `serial`/identity default yet) — the sequence is wired
-- up at the end of this file, after acknowledging that historical rows
-- will be inserted with explicit ids first.

-- ── users ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              integer PRIMARY KEY,
    email           text NOT NULL UNIQUE,
    hashed_password text NOT NULL,
    is_active       boolean NOT NULL DEFAULT true,
    role            text NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
    created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS
    'Migrated from the TinyDB "users" table (services/api/db.json). IDs '
    'preserved 1:1 from the former TinyDB doc_id — see '
    'migrate_tinydb_to_sql.py. Never stores name/phone/address (those '
    'live on the linked "profiles" row).';

-- ── profiles ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id         serial PRIMARY KEY,
    user_id    integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name       text,
    phone      text,
    address    text
);

COMMENT ON TABLE profiles IS
    'Migrated from the TinyDB "profiles" table. One-to-one with users via '
    'the UNIQUE + FK on user_id — this was previously only enforced in '
    'application code (app.services.profiles.create_profile).';

-- ── password_reset_tokens ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          serial PRIMARY KEY,
    user_id     integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  text NOT NULL,
    created_at  timestamptz NOT NULL,
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz
);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id
    ON password_reset_tokens USING btree (user_id);

COMMENT ON TABLE password_reset_tokens IS
    'Migrated from the TinyDB "password_reset_tokens" table. Had no '
    'Pydantic schema even before the migration (built as a raw dict) — '
    'that remains true; this table''s own column list is the only '
    'contract.';

-- ── suppliers ──────────────────────────────────────────────────────────
-- Note on naming (carried over as-is, not redesigned here): this entity's
-- fields are the Brasa Points loyalty-registration shape (full_name,
-- date_of_birth, dietary_preferences, accepts_terms, ...), while the
-- table/column names (suppliers, rate, status, product_category) read
-- like a vendor directory. Both were already true in TinyDB.
CREATE TABLE IF NOT EXISTS suppliers (
    id                  integer PRIMARY KEY,
    full_name           text NOT NULL,
    email               text NOT NULL UNIQUE,
    phone               text NOT NULL,
    country             text NOT NULL,
    city                text NOT NULL,
    favorite_location   text,
    dietary_preferences jsonb NOT NULL DEFAULT '[]'::jsonb,
    how_did_you_find_us text,
    date_of_birth       date NOT NULL,
    accepts_terms       boolean NOT NULL,
    wants_email_offers  boolean NOT NULL DEFAULT false,
    product_category    text,
    rate                double precision,
    status              text NOT NULL CHECK (status IN ('active', 'suspended')),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE suppliers IS
    'Migrated from the TinyDB "suppliers" table. IDs preserved 1:1 from '
    'the former TinyDB doc_id — referenced by inbound_stock.supplier_id '
    '(see the FK-retrofit migration).';

-- ── incidents ──────────────────────────────────────────────────────────
-- `id` is plain text, not uuid: create_incident() generates a real
-- uuid4(), but seed_incidents.py (CSV import) reuses the legacy report's
-- own incident_id code (e.g. "BRS-000001") as the row id, for idempotent
-- re-seeding — a strict uuid column would reject those rows.
CREATE TABLE IF NOT EXISTS incidents (
    id                 text PRIMARY KEY,
    title              text NOT NULL,
    description        text NOT NULL,
    category           text NOT NULL
        CHECK (category IN ('CUSTOMER_COMPLAINT', 'EQUIPMENT', 'SUPPLY', 'FOOD_QUALITY', 'STAFF')),
    status             text NOT NULL
        CHECK (status IN ('open', 'in_progress', 'resolved', 'discarded')),
    origin             text NOT NULL
        CHECK (origin IN ('customer', 'branch', 'headquarters')),
    branch             text NOT NULL,
    customer_id        text,
    satisfaction_score integer CHECK (satisfaction_score BETWEEN 1 AND 5),
    reporter_id        text,
    incident_date      date,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE incidents IS
    'Migrated from the TinyDB "incidents" table. "id" is plain text, not '
    'uuid, since not every row''s id is a UUID (seed_incidents.py reuses '
    'the legacy CSV''s own incident_id code). customer_id/reporter_id '
    'stay free text — legacy CSV codes (incidents-context.md), never '
    'references to another table.';

-- ── records (candidate pipeline) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS records (
    id               uuid PRIMARY KEY,
    full_name        text NOT NULL,
    email            text NOT NULL,
    phone            text,
    position         text NOT NULL,
    linkedin_url     text,
    cv_url           text,
    status           text NOT NULL
        CHECK (status IN ('received', 'in_progress', 'selected', 'discarded')),
    stage            text NOT NULL
        CHECK (stage IN ('pending', 'review', 'personal_interview', 'technical_interview', 'offer_presented')),
    experience_years integer NOT NULL,
    applied_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE records IS
    'Migrated from the TinyDB "records" table. Already used a string '
    'UUID as its own "id" field in TinyDB, so no ID remapping was needed.';

-- ── candidate_notes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_notes (
    id         uuid PRIMARY KEY,
    record_id  uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    content    text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_candidate_notes_record_id
    ON candidate_notes USING btree (record_id);

COMMENT ON TABLE candidate_notes IS
    'Migrated from the TinyDB "candidate_notes" table. record_id is now '
    'a real FK with ON DELETE CASCADE, replacing the manual cascade '
    'delete app.services.records used to do in Python.';

-- ── Sequences for users/suppliers (after historical-id-preserving load) ─
--
-- users.id / suppliers.id are declared as plain `integer primary key`
-- above (not `serial`) specifically so migrate_tinydb_to_sql.py can
-- insert historical rows with their exact former TinyDB doc_id. Once
-- that data load has happened, the application still needs normal
-- auto-increment behavior for *new* rows — this wires up a sequence
-- that continues from the next free id, same effect `serial` would have
-- given if the table had been empty.
--
-- NOTE: running this block before the data load is harmless (it just
-- starts the sequence at 1), but it must be RE-RUN (or the final
-- `setval` re-executed) after migrate_tinydb_to_sql.py's data load so
-- new inserts don't collide with preserved historical ids. See
-- migrate_tinydb_to_sql.py's own summary output for the exact command.
CREATE SEQUENCE IF NOT EXISTS users_id_seq OWNED BY users.id;
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));

CREATE SEQUENCE IF NOT EXISTS suppliers_id_seq OWNED BY suppliers.id;
ALTER TABLE suppliers ALTER COLUMN id SET DEFAULT nextval('suppliers_id_seq');
SELECT setval('suppliers_id_seq', COALESCE((SELECT MAX(id) FROM suppliers), 1));
