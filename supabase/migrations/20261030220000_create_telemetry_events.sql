-- Telemetry storage foundation — telemetry_events
--
-- No prior "approved" table contract or properties<->tags mapping existed
-- anywhere in the repository at the time this migration was written
-- (confirmed by an exhaustive search across the repo, both telemetry
-- branches, and all docs/ files). This schema was designed from scratch,
-- confirmed with the user: `tags` is the storage-layer column name for the
-- API envelope's `properties` field (services/api/app/models/telemetry.py)
-- — not a separate, additional concept.
--
-- Column types/conventions mirror the project's existing SQLModel tables
-- (menu_items, inbound_stock, stock_exits — see
-- services/api/app/core/database.py): `timestamp with time zone` for every
-- timestamp column, `ix_<table>_<column>` for index names.
--
-- Scope: storage table + mapping only (per task instructions). The
-- ingestion endpoint (services/api/app/routers/telemetry.py) is NOT wired
-- to insert into this table in this migration.

-- ── Table ──────────────────────────────────────────────────────────────
-- Column-by-column mapping from TelemetryEvent (services/api/app/models/telemetry.py):
--   eventId       -> event_id       (uuid, PRIMARY KEY — see note below)
--   timestamp     -> "timestamp"    (timestamptz, not null)
--   sessionId     -> session_id     (text, nullable — see TelemetryEvent docstring)
--   userId        -> user_id        (text, nullable)
--   event_type    -> event_type     (text, not null; same name as the API field)
--   schemaVersion -> schema_version (text, not null)
--   requestId     -> request_id     (text, nullable)
--   properties    -> tags           (jsonb, not null — see header note)
--
-- `event_id` as the primary key (not a separate surrogate `id`) is
-- deliberate: it makes a retried/duplicated delivery of the same captured
-- event a no-op (INSERT fails on the uniqueness constraint) rather than a
-- silent duplicate row — the dedup-by-eventId responsibility already
-- flagged in docs/event-delivery-strategy.md section 3.4.
--
-- `received_at` has no corresponding TelemetryEvent field — it is this
-- table's own server-side ingestion timestamp (when the row was actually
-- written), kept separate from the event's own client-reported
-- `"timestamp"` on purpose (the two can differ under clock skew or a
-- delayed/retried delivery). The mapping function never sets it; the
-- column default does.
--
-- CHECK constraints on event_type/schema_version mirror the same
-- patterns already enforced at the API layer (EventType/SchemaVersion in
-- services/api/app/models/telemetry.py) as defense-in-depth, not a new rule.
CREATE TABLE IF NOT EXISTS telemetry_events (
    event_id        uuid PRIMARY KEY,
    "timestamp"     timestamptz NOT NULL,
    session_id      text,
    user_id         text,
    event_type      text NOT NULL
        CHECK (event_type ~ '^[a-z]+(_[a-z]+)+$'),
    schema_version  text NOT NULL
        CHECK (schema_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
    request_id      text,
    tags            jsonb NOT NULL,
    received_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE telemetry_events IS
    'Append-only telemetry event log. Rows are immutable once inserted — '
    'see the triggers below. Source contract: TelemetryEvent in '
    'services/api/app/models/telemetry.py; "tags" stores that model''s '
    '"properties" field.';
COMMENT ON COLUMN telemetry_events.tags IS
    'Maps 1:1 from the API envelope''s "properties" field (jsonb for GIN '
    'indexability — see ix_telemetry_events_tags below).';
COMMENT ON COLUMN telemetry_events.received_at IS
    'Server-side insert time. Distinct from "timestamp" (the event''s own '
    'client-reported capture time) — not part of the TelemetryEvent API '
    'model, defaults to now() at insert, never set by the mapping layer.';

-- ── Indexes (the 3 required) ─────────────────────────────────────────────
-- B-tree on "timestamp": range/ordering queries (e.g. "events in the last hour").
CREATE INDEX IF NOT EXISTS ix_telemetry_events_timestamp
    ON telemetry_events USING btree ("timestamp");

-- B-tree on event_type: equality/grouping queries (e.g. "all login_failed events").
CREATE INDEX IF NOT EXISTS ix_telemetry_events_event_type
    ON telemetry_events USING btree (event_type);

-- GIN on tags: jsonb + the default jsonb_ops operator class supports the
-- containment (@>) and key-existence (?, ?&, ?|) operators needed for
-- "find events whose properties match {...}"-style queries. A plain
-- `json` column (instead of `jsonb`) would not support GIN indexing at
-- all — jsonb was chosen specifically for this.
CREATE INDEX IF NOT EXISTS ix_telemetry_events_tags
    ON telemetry_events USING gin (tags);

-- ── Immutability enforcement ─────────────────────────────────────────────
-- The role this backend connects as (see services/api/app/core/database.py,
-- DATABASE_URL) has rolbypassrls = true (verified by direct read-only query
-- against the connected instance) — meaning Row Level Security policies
-- are silently IGNORED for that role. RLS alone cannot enforce immutability
-- here. Triggers, by contrast, fire for every role (including one with
-- BYPASSRLS) as long as session_replication_role = 'origin' (the default),
-- and changing that setting itself requires true superuser privilege,
-- which the connecting role does NOT have (rolsuper = false, confirmed).
-- This makes a BEFORE UPDATE/DELETE/TRUNCATE trigger the actual
-- enforcement mechanism against this project's real backend role — RLS
-- below is added only as defense-in-depth for any future, more restricted
-- role (e.g. a genuine Supabase `authenticated`/`anon` role) that is not
-- exempt from it.
CREATE OR REPLACE FUNCTION reject_telemetry_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'telemetry_events rows are immutable: % is not permitted on this table',
        TG_OP
        USING ERRCODE = 'insufficient_privilege';
END;
$$;

COMMENT ON FUNCTION reject_telemetry_events_mutation() IS
    'Unconditionally rejects UPDATE/DELETE/TRUNCATE on telemetry_events. '
    'Fires for every role, including one with rolbypassrls=true, since '
    'triggers are not governed by RLS.';

DROP TRIGGER IF EXISTS telemetry_events_no_update ON telemetry_events;
CREATE TRIGGER telemetry_events_no_update
    BEFORE UPDATE ON telemetry_events
    FOR EACH ROW
    EXECUTE FUNCTION reject_telemetry_events_mutation();

DROP TRIGGER IF EXISTS telemetry_events_no_delete ON telemetry_events;
CREATE TRIGGER telemetry_events_no_delete
    BEFORE DELETE ON telemetry_events
    FOR EACH ROW
    EXECUTE FUNCTION reject_telemetry_events_mutation();

-- TRUNCATE bypasses per-row UPDATE/DELETE triggers entirely (it doesn't
-- evaluate rows at all), so it needs its own statement-level trigger —
-- otherwise TRUNCATE would remain an unguarded way to wipe the table.
DROP TRIGGER IF EXISTS telemetry_events_no_truncate ON telemetry_events;
CREATE TRIGGER telemetry_events_no_truncate
    BEFORE TRUNCATE ON telemetry_events
    FOR EACH STATEMENT
    EXECUTE FUNCTION reject_telemetry_events_mutation();

-- Row Level Security: defense-in-depth for any role that is NOT exempt via
-- BYPASSRLS (the current backend role is exempt — see note above; this
-- does not protect against that role, the triggers do). Only SELECT and
-- INSERT policies are defined; no UPDATE/DELETE policy exists, so RLS
-- denies those operations outright for any covered role, independent of
-- (and in addition to) the trigger-based rejection.
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telemetry_events_select_all ON telemetry_events;
CREATE POLICY telemetry_events_select_all
    ON telemetry_events
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS telemetry_events_insert_only ON telemetry_events;
CREATE POLICY telemetry_events_insert_only
    ON telemetry_events
    FOR INSERT
    WITH CHECK (true);

-- Explicit REVOKE as documented intent / defense-in-depth for any future
-- non-owning role. Has no effect on the current connecting role (table
-- owners retain implicit privileges on their own objects regardless of
-- REVOKE) — again, the triggers are what actually stop that role.
REVOKE UPDATE, DELETE, TRUNCATE ON telemetry_events FROM PUBLIC;
