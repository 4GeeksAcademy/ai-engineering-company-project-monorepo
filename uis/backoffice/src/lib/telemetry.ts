// TelemetryService: the only way the backoffice reports usage. Everything goes through track().
//
// - Local queue: events wait in memory; each one is stamped when it is captured, not when it is sent.
// - Batch + debounce: the queue is sent in ONE request every 10 s or at 20 events, whichever comes first.
// - Reliable flush: when the tab is hidden or closed the pending events go out with navigator.sendBeacon.
// - Retries with exponential backoff: a failed send is retried 3 times (1 s, 2 s, 4 s), then dropped.
//   Telemetry is not critical: it never blocks, throws into, or shows anything to the app.
//
// The endpoint is NEXT_PUBLIC_TELEMETRY_ENDPOINT. Unset, track() does nothing.
// This file is the only place that sends telemetry over the network (no fetch/axios elsewhere).

import { getToken, getUserId, subscribeToToken } from "@/lib/auth";
import { currentRequestId } from "@/lib/requestContext";
import {
  BASE_BACKOFF_MS,
  EVENT_SOURCE,
  FLUSH_INTERVAL_MS,
  MAX_BATCH_SIZE,
  MAX_EVENTS_PER_REQUEST,
  MAX_QUEUE_SIZE,
  MAX_RETRIES,
  SCHEMA_VERSION,
} from "@/lib/telemetryConfig";
import { uuid } from "@/lib/uuid";

type TelemetryEvent = {
  eventId: string;
  timestamp: string;
  sessionId: string;
  userId: string;
  event_type: string;
  schemaVersion: string;
  requestId: string;
  source: typeof EVENT_SOURCE;
  properties: Record<string, unknown>;
};

const SESSION_KEY = "nexova.telemetry.sessionId";
const ANONYMOUS = "anonymous";

const queue: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
/** Batches waiting for a retry, with their timer, so a closing tab can still send them. */
const retrying = new Map<TelemetryEvent[], ReturnType<typeof setTimeout>>();
let initialized = false;
let hadToken = false;
let memorySessionId: string | undefined;
const lastSeen = new Map<string, number>();
const perSession = new Map<string, number>();

// Backstop for the rule "never emit PII": property keys that can only carry personal data are dropped.
const FORBIDDEN_KEY = /^(e-?mail|password|passwd|token|name|full_?name|phone|address|assigned_to|supplier|title|description)$/i;

/** Per-event_type rate limits from the plan (`x-throttle`). The window is per tab; it resets on logout. */
const THROTTLES: Record<string, { windowMs: number; key: (p: Record<string, unknown>) => string; maxPerSession?: number }> = {
  page_viewed: { windowMs: 1_000, key: (p) => String(p.route_template) },
  api_request_failed: { windowMs: 30_000, key: (p) => `${p.route_template}|${p.kind}` },
  frontend_error_captured: { windowMs: 60_000, key: (p) => String(p.fingerprint), maxPerSession: 20 },
  session_expired: { windowMs: 5_000, key: () => "-" },
};

function endpoint(): string | undefined {
  // Literal access: Next.js inlines NEXT_PUBLIC_* values at build time only like this.
  return process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT?.trim() || undefined;
}

function sessionId(): string {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return (memorySessionId ??= uuid()); // storage blocked: the id lives as long as the page
  }
}

function rotateSession(): void {
  memorySessionId = undefined;
  lastSeen.clear();
  perSession.clear();
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing stored */
  }
}

function limited(eventType: string, properties: Record<string, unknown>): boolean {
  const rule = THROTTLES[eventType];
  if (!rule) return false;
  const now = Date.now();
  const key = `${eventType}|${rule.key(properties)}`;
  const last = lastSeen.get(key);
  if (last !== undefined && now - last < rule.windowMs) return true;
  const total = perSession.get(eventType) ?? 0;
  if (rule.maxPerSession !== undefined && total >= rule.maxPerSession) return true;
  lastSeen.set(key, now);
  perSession.set(eventType, total + 1);
  return false;
}

function clearTimer(): void {
  if (flushTimer !== undefined) clearTimeout(flushTimer);
  flushTimer = undefined;
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// text/plain is CORS-safelisted: no preflight request, which a closing page cannot complete. The body is still JSON.
const CONTENT_TYPE = "text/plain;charset=UTF-8";

async function send(batch: TelemetryEvent[], url: string, attempt = 0): Promise<void> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": CONTENT_TYPE },
      body: JSON.stringify({ events: batch }),
      keepalive: true, // lets the request outlive the page
    });
    if (response.ok) return;
    // The server refused this payload: sending it again cannot help.
    if (response.status < 500 && response.status !== 408 && response.status !== 429) return;
  } catch {
    /* network failure: retry below */
  }
  if (attempt >= MAX_RETRIES) return; // give up: drop the batch
  const timer = setTimeout(() => {
    retrying.delete(batch);
    void send(batch, url, attempt + 1);
  }, BASE_BACKOFF_MS * 2 ** attempt);
  retrying.set(batch, timer);
}

/** Sends everything queued, in requests of at most 100 events. */
function flush(): void {
  clearTimer();
  const url = endpoint();
  if (queue.length === 0) return;
  const events = queue.splice(0, queue.length);
  if (!url) return;
  for (const batch of chunks(events, MAX_EVENTS_PER_REQUEST)) void send(batch, url);
}

/** The page is going away: queued events and batches waiting to retry leave with sendBeacon. */
function flushOnHide(): void {
  clearTimer();
  const url = endpoint();
  const batches = [...retrying.keys()];
  for (const timer of retrying.values()) clearTimeout(timer);
  retrying.clear();
  if (queue.length > 0) batches.push(...chunks(queue.splice(0, queue.length), MAX_EVENTS_PER_REQUEST));
  if (!url) return;
  for (const batch of batches) {
    const body = new Blob([JSON.stringify({ events: batch })], { type: CONTENT_TYPE });
    let queued = false;
    try {
      queued = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(url, body);
    } catch {
      /* fall through to keepalive fetch */
    }
    if (!queued) void fetch(url, { method: "POST", headers: { "Content-Type": CONTENT_TYPE }, body, keepalive: true }).catch(() => undefined);
  }
}

function init(): void {
  initialized = true;
  hadToken = getToken() !== null;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushOnHide();
  });
  window.addEventListener("pagehide", flushOnHide); // Safari does not always fire visibilitychange on close
  // A new session starts after logout / expiry; the id also survives the login so a failed attempt and its success share it.
  subscribeToToken(() => {
    const hasToken = getToken() !== null;
    if (hadToken && !hasToken) {
      flush();
      rotateSession();
    }
    hadToken = hasToken;
  });
}

/**
 * Records one event. Call it from anywhere in the backoffice; the service adds eventId, timestamp,
 * sessionId, userId, schemaVersion, source and requestId. `eventType` becomes the envelope's `event_type`;
 * `properties` must hold only the keys the event's allowlist permits (docs/telemetry/event-schemas.json).
 */
export function track(eventType: string, properties: Record<string, unknown>): void {
  if (typeof window === "undefined") return; // server render
  try {
    if (!initialized) init();
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (value !== undefined && !FORBIDDEN_KEY.test(key)) clean[key] = value;
    }
    if (limited(eventType, clean)) return;
    if (!endpoint()) return;

    queue.push({
      eventId: uuid(),
      timestamp: new Date().toISOString(),
      sessionId: sessionId(),
      userId: getUserId() ?? ANONYMOUS,
      event_type: eventType,
      schemaVersion: SCHEMA_VERSION,
      requestId: currentRequestId() ?? uuid(),
      source: EVENT_SOURCE,
      properties: clean,
    });
    if (queue.length > MAX_QUEUE_SIZE) queue.splice(0, queue.length - MAX_QUEUE_SIZE);

    if (queue.length >= MAX_BATCH_SIZE) flush();
    else flushTimer ??= setTimeout(flush, FLUSH_INTERVAL_MS);
  } catch {
    /* telemetry must never break the app */
  }
}
