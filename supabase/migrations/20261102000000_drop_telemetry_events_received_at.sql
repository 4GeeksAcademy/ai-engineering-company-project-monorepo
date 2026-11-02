-- Drop telemetry_events.received_at
--
-- The approved contract is exactly the 8 TelemetryEvent envelope fields
-- (services/api/app/models/telemetry.py): eventId, timestamp, sessionId,
-- userId, event_type, schemaVersion, requestId, properties(->tags).
--
-- `received_at` was added in 20261030220000_create_telemetry_events.sql as
-- an extra, self-initiated audit column (server-side insert time, distinct
-- from the event's own client-reported `timestamp`) — documented there at
-- the time as a deliberate addition beyond the 8-field contract, not part
-- of it. It is removed here to match the approved 8-column contract
-- exactly, per explicit confirmation from the project owner.
--
-- Per project convention, the already-applied migration above is left
-- untouched; this is a new, separate, versioned migration.

ALTER TABLE telemetry_events DROP COLUMN IF EXISTS received_at;
