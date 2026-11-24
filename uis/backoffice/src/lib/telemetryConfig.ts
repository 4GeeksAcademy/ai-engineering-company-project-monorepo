// Shared constants of the telemetry capture (docs/telemetry/telemetry-plan.md, section 2).

/** SemVer of every event schema today (docs/telemetry/event-schemas.json). Bump per event_type when its payload changes. */
export const SCHEMA_VERSION = "1.0.0";

/** Who emits these events (envelope `source`). */
export const EVENT_SOURCE = "frontend";

/** A batch goes out this long after its first event was queued... */
export const FLUSH_INTERVAL_MS = 10_000;
/** ...or as soon as the queue holds this many events, whichever comes first. */
export const MAX_BATCH_SIZE = 20;

/** After the first failed send, retry this many times (waits of 1 s, 2 s, 4 s), then drop the batch. */
export const MAX_RETRIES = 3;
export const BASE_BACKOFF_MS = 1_000;

/** Events kept while a flush is failing; the oldest go first. The backend accepts 100 per request. */
export const MAX_QUEUE_SIZE = 200;
export const MAX_EVENTS_PER_REQUEST = 100;
