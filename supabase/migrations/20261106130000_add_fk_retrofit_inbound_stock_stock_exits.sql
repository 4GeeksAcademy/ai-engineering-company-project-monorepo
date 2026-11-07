-- Retrofit real foreign keys on inbound_stock/stock_exits now that
-- users/suppliers exist as real SQL tables (see
-- 20261106120000_create_users_profiles_tokens_suppliers_incidents_records.sql).
--
-- Before this migration, InboundStock.supplier_id and
-- InboundStock/StockExit.user_uuid were documented explicitly (see their
-- module docstrings in app/models/inbound.py / outbound.py) as "no SQL
-- FK across stores" — they held TinyDB doc_ids as a bare int/string with
-- no referential integrity. Now that those doc_ids are real primary keys
-- in `users`/`suppliers`, this migration adds the FK that was always
-- conceptually true but never enforced.
--
-- MUST run strictly after migrate_tinydb_to_sql.py has loaded users and
-- suppliers with their preserved historical ids — otherwise the
-- `USING user_uuid::integer` cast and the FK checks below will fail on
-- any row whose supplier_id/user_uuid doesn't yet have a matching users/
-- suppliers row.
--
-- `user_uuid` keeps its existing (slightly misleading, since it's an
-- integer id, not a UUID) column name — renaming it would ripple into
-- app/models/inbound.py, outbound.py, app/routers/inventory.py, and
-- several tests for no functional benefit; flagged here as a known,
-- deliberately-not-fixed naming inconsistency.

ALTER TABLE inbound_stock
    ADD CONSTRAINT fk_inbound_stock_supplier_id
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

ALTER TABLE inbound_stock
    ALTER COLUMN user_uuid TYPE integer USING user_uuid::integer;

ALTER TABLE inbound_stock
    ADD CONSTRAINT fk_inbound_stock_user_id
    FOREIGN KEY (user_uuid) REFERENCES users(id);

ALTER TABLE stock_exits
    ALTER COLUMN user_uuid TYPE integer USING user_uuid::integer;

ALTER TABLE stock_exits
    ADD CONSTRAINT fk_stock_exits_user_id
    FOREIGN KEY (user_uuid) REFERENCES users(id);

COMMENT ON COLUMN inbound_stock.supplier_id IS
    'FK to suppliers.id (retrofitted — see 20261106130000). Nullable: '
    'InboundStock.supplier_id was always optional.';
COMMENT ON COLUMN inbound_stock.user_uuid IS
    'FK to users.id (retrofitted — see 20261106130000). Column name kept '
    'as "user_uuid" even though it is an integer, not a UUID, to avoid '
    'rippling the rename across app code/tests for no functional gain.';
COMMENT ON COLUMN stock_exits.user_uuid IS
    'FK to users.id (retrofitted — see 20261106130000). Same naming note '
    'as inbound_stock.user_uuid.';
