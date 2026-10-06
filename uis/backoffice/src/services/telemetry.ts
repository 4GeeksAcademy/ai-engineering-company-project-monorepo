/**
 * TelemetryService for the Brasaland staff console.
 *
 * One public capture function: `track(eventType, properties)`.
 * The envelope follows docs/telemetry/telemetry-plan.md (not the README's
 * eventId / event_type spellings): eventID, timestamp, sessionID, UserID,
 * Event_type, SchemaVersion, requestID, source, tags, properties.
 *
 * Queue + batch (10s or 20 events), sendBeacon on visibilitychange,
 * up to 3 retries with exponential backoff, then the batch is discarded.
 */

export const SCHEMA_VERSION = 1;
export const FLUSH_INTERVAL_MS = 10_000;
export const MAX_QUEUE_SIZE = 20;
/** Retries after the first attempt. Four posts total, then discard. */
export const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 200;
const SESSION_STORAGE_KEY = "brasaland.telemetry.sessionID";

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export type TelemetryProperties = Record<string, unknown>;

export type TelemetryEvent = {
  eventID: string;
  timestamp: string;
  sessionID: string | null;
  UserID: string | null;
  Event_type: string;
  SchemaVersion: number;
  requestID: string;
  source: string;
  tags: {
    source: string;
    location_scope: string;
    location_id?: string;
    country?: string;
    currency?: string;
  };
  properties: TelemetryProperties;
};

type Identity = "anonymous" | "staff" | "current";

type CatalogEntry = {
  source: string;
  keys: readonly string[];
  required: readonly string[];
  identity: Identity;
};

const FORBIDDEN_KEYS = new Set([
  "email",
  "name",
  "password",
  "phone",
  "address",
  "message",
  "stack",
  "componentstack",
  "component_stack",
  "token",
  "authorization",
  "query",
  "detail",
]);

const CATALOG: Record<string, CatalogEntry> = {
  section_viewed: {
    source: "uis.backoffice",
    keys: ["location_scope", "app", "section", "required", "ready", "path"],
    required: ["location_scope", "app", "section", "required", "ready", "path"],
    identity: "current",
  },
  flow_step_recorded: {
    source: "uis.backoffice",
    keys: ["location_scope", "flow_id", "flow_instance", "step", "outcome"],
    required: ["location_scope", "flow_id", "flow_instance", "step", "outcome"],
    identity: "current",
  },
  auth_form_rejected: {
    source: "uis.backoffice",
    keys: ["location_scope", "form", "reason", "field"],
    required: ["location_scope", "form", "reason", "field"],
    identity: "current",
  },
  session_ended: {
    source: "uis.backoffice",
    keys: ["location_scope", "reason"],
    required: ["location_scope", "reason"],
    identity: "current",
  },
  session_rejected: {
    source: "uis.backoffice",
    keys: ["location_scope", "reason", "path"],
    required: ["location_scope", "reason", "path"],
    identity: "current",
  },
  session_expired: {
    source: "services.api.auth",
    keys: ["location_scope", "route_template"],
    required: ["location_scope", "route_template"],
    identity: "current",
  },
  account_updated: {
    source: "uis.backoffice",
    keys: ["location_scope", "action", "outcome", "reason"],
    required: ["location_scope", "action", "outcome", "reason"],
    identity: "current",
  },
  api_latency_recorded: {
    source: "uis.backoffice",
    keys: ["location_scope", "method", "route_template", "http_status", "duration_ms", "outcome"],
    required: ["location_scope", "method", "route_template", "http_status", "duration_ms", "outcome"],
    identity: "current",
  },
  ui_latency_recorded: {
    source: "uis.backoffice",
    keys: ["location_scope", "kind", "name", "duration_ms", "outcome"],
    required: ["location_scope", "kind", "name", "duration_ms", "outcome"],
    identity: "current",
  },
  client_exception_caught: {
    source: "uis.backoffice",
    keys: ["location_scope", "catch_site", "app", "path", "error_name"],
    required: ["location_scope", "catch_site", "app", "path", "error_name"],
    identity: "current",
  },
  user_login_succeeded: {
    source: "services.api.users",
    keys: ["location_scope", "method", "route"],
    required: ["location_scope", "method", "route"],
    identity: "staff",
  },
  user_login_failed: {
    source: "services.api.users",
    keys: ["location_scope", "method", "route", "failure_reason"],
    required: ["location_scope", "method", "route", "failure_reason"],
    identity: "anonymous",
  },
  product_created: {
    source: "services.api.inventory",
    keys: ["location_scope", "product_id", "product_name", "quantity", "unit"],
    required: ["location_scope", "product_id", "product_name", "quantity", "unit"],
    identity: "current",
  },
  stock_count_adjusted: {
    source: "services.api.inventory",
    keys: [
      "location_scope",
      "product_id",
      "product_name",
      "unit",
      "reason",
      "delta",
      "quantity_before",
      "quantity_after",
    ],
    required: [
      "location_scope",
      "product_id",
      "product_name",
      "unit",
      "reason",
      "delta",
      "quantity_before",
      "quantity_after",
    ],
    identity: "current",
  },
  stock_threshold_crossed: {
    source: "services.api.inventory",
    keys: [
      "location_scope",
      "product_id",
      "product_name",
      "unit",
      "quantity_before",
      "quantity_after",
      "threshold",
    ],
    required: [
      "location_scope",
      "product_id",
      "product_name",
      "unit",
      "quantity_before",
      "quantity_after",
      "threshold",
    ],
    identity: "current",
  },
  stock_threshold_cleared: {
    source: "services.api.inventory",
    keys: [
      "location_scope",
      "product_id",
      "product_name",
      "unit",
      "quantity_before",
      "quantity_after",
      "threshold",
    ],
    required: [
      "location_scope",
      "product_id",
      "product_name",
      "unit",
      "quantity_before",
      "quantity_after",
      "threshold",
    ],
    identity: "current",
  },
  direct_stock_edit_rejected: {
    source: "services.api.inventory",
    keys: [
      "location_scope",
      "reason",
      "http_status",
      "product_id",
      "product_name",
      "delta",
      "quantity_before",
    ],
    required: ["location_scope", "reason", "http_status"],
    identity: "current",
  },
  inventory_validation_failed: {
    source: "services.api.errors",
    keys: ["location_scope", "method", "route_template", "http_status", "fields"],
    required: ["location_scope", "method", "route_template", "http_status", "fields"],
    identity: "current",
  },
  sale_completed: {
    source: "services.api.sales",
    keys: [
      "location_scope",
      "location_id",
      "country",
      "currency",
      "timezone",
      "ticket_id",
      "business_date",
      "channel",
      "covers",
      "covers_source",
      "amount",
      "fx_status",
      "fx_rate_usd_per_local",
      "amount_usd",
      "lines",
      "loyalty_attached",
      "loyalty_account_id",
      "customer_id",
      "points_earned",
    ],
    required: [
      "location_scope",
      "location_id",
      "country",
      "currency",
      "timezone",
      "ticket_id",
      "business_date",
      "channel",
      "covers",
      "covers_source",
      "amount",
      "fx_status",
      "lines",
      "loyalty_attached",
      "points_earned",
    ],
    identity: "current",
  },
  inbound_order_created: {
    source: "services.api.orders",
    keys: [
      "location_scope",
      "location_id",
      "country",
      "currency",
      "timezone",
      "order_id",
      "line_index",
      "product_id",
      "product_name",
      "quantity",
      "unit",
      "supplier_id",
      "category",
      "order_kind",
      "list_cost",
      "surcharge_rate",
      "cost",
      "unit_price",
      "fx_status",
      "fx_rate_usd_per_local",
      "amount_usd",
      "approval_required",
      "approval_state",
    ],
    required: [
      "location_scope",
      "location_id",
      "country",
      "currency",
      "timezone",
      "order_id",
      "line_index",
      "product_id",
      "product_name",
      "quantity",
      "unit",
      "supplier_id",
      "category",
      "order_kind",
      "list_cost",
      "surcharge_rate",
      "cost",
      "unit_price",
      "fx_status",
      "approval_required",
      "approval_state",
    ],
    identity: "current",
  },
  ingredient_price_variance_detected: {
    source: "services.api.orders",
    keys: [
      "location_scope",
      "location_id",
      "country",
      "currency",
      "timezone",
      "product_id",
      "product_name",
      "supplier_id",
      "order_id",
      "previous_unit_price",
      "unit_price",
      "variance_pct",
    ],
    required: [
      "location_scope",
      "location_id",
      "country",
      "currency",
      "timezone",
      "product_id",
      "product_name",
      "supplier_id",
      "order_id",
      "previous_unit_price",
      "unit_price",
      "variance_pct",
    ],
    identity: "current",
  },
  customer_preference_recorded: {
    source: "services.api.customers",
    keys: ["location_scope", "customer_id", "preference_code", "preference_value"],
    required: ["location_scope", "customer_id", "preference_code", "preference_value"],
    identity: "current",
  },
  recommendation_shown: {
    source: "services.api.recommendations",
    keys: [
      "location_scope",
      "location_id",
      "country",
      "currency",
      "timezone",
      "recommendation_id",
      "customer_id",
      "menu_item_name",
      "surface",
    ],
    required: [
      "location_scope",
      "location_id",
      "country",
      "currency",
      "timezone",
      "recommendation_id",
      "menu_item_name",
      "surface",
    ],
    identity: "current",
  },
  recommendation_accepted: {
    source: "services.api.recommendations",
    keys: [
      "location_scope",
      "location_id",
      "country",
      "currency",
      "timezone",
      "recommendation_id",
      "customer_id",
      "menu_item_name",
      "accepted",
    ],
    required: [
      "location_scope",
      "location_id",
      "country",
      "currency",
      "timezone",
      "recommendation_id",
      "menu_item_name",
      "accepted",
    ],
    identity: "current",
  },
  employee_hired: {
    source: "services.api.people",
    keys: ["location_scope", "country", "employee_id", "effective_date", "employment_basis"],
    required: ["location_scope", "country", "employee_id", "effective_date", "employment_basis"],
    identity: "current",
  },
  employee_separated: {
    source: "services.api.people",
    keys: ["location_scope", "country", "employee_id", "effective_date", "separation_kind"],
    required: ["location_scope", "country", "employee_id", "effective_date", "separation_kind"],
    identity: "current",
  },
  absence_recorded: {
    source: "services.api.people",
    keys: ["location_scope", "country", "employee_id", "absence_date", "day_fraction", "absence_kind"],
    required: ["location_scope", "country", "employee_id", "absence_date", "day_fraction", "absence_kind"],
    identity: "current",
  },
  roster_day_scheduled: {
    source: "services.api.people",
    keys: ["location_scope", "country", "employee_id", "roster_date", "scheduled"],
    required: ["location_scope", "country", "employee_id", "roster_date", "scheduled"],
    identity: "current",
  },
  vacancy_opened: {
    source: "services.api.people",
    keys: ["location_scope", "country", "vacancy_id", "opened_on", "employment_basis"],
    required: ["location_scope", "country", "vacancy_id", "opened_on", "employment_basis"],
    identity: "current",
  },
  vacancy_filled: {
    source: "services.api.people",
    keys: ["location_scope", "country", "vacancy_id", "opened_on", "filled_on", "days_to_fill"],
    required: ["location_scope", "country", "vacancy_id", "opened_on", "filled_on", "days_to_fill"],
    identity: "current",
  },
  recipe_update_published: {
    source: "services.api.training",
    keys: ["location_scope", "recipe_id", "version", "locale", "title"],
    required: ["location_scope", "recipe_id", "version", "locale", "title"],
    identity: "current",
  },
  recipe_update_acknowledged: {
    source: "services.api.training",
    keys: ["location_scope", "location_id", "country", "currency", "timezone", "recipe_id", "version"],
    required: ["location_scope", "location_id", "country", "currency", "timezone", "recipe_id", "version"],
    identity: "current",
  },
};

type IntervalHandle = { cancel: () => void };

type TestHooks = {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  startInterval?: (fn: () => void, ms: number) => IntervalHandle;
  sendBeaconImpl?: (url: string, body: string) => boolean;
};

let queue: TelemetryEvent[] = [];
let sessionId: string | null = null;
let userId: string | null = null;
let sessionEndSent = false;
let listenersBound = false;
let intervalHandle: IntervalHandle | null = null;
let sendChain: Promise<void> = Promise.resolve();
let endpointOverride: string | null = null;
let fetchOverride: typeof fetch | null = null;
let sleepOverride: ((ms: number) => Promise<void>) | null = null;
let intervalOverride: ((fn: () => void, ms: number) => IntervalHandle) | null = null;
let beaconOverride: ((url: string, body: string) => boolean) | null = null;
const memoryStore = new Map<string, string>();

function envEndpoint(): string {
  try {
    const env = import.meta.env as { NEXT_PUBLIC_TELEMETRY_ENDPOINT?: string } | undefined;
    const value = env?.NEXT_PUBLIC_TELEMETRY_ENDPOINT;
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

function endpointUrl(): string {
  if (endpointOverride !== null) {
    return endpointOverride;
  }
  return envEndpoint();
}

export function captureTimestamp(now = new Date()): string {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function browserStore(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  try {
    if (typeof sessionStorage === "undefined") {
      return null;
    }
    return sessionStorage;
  } catch {
    return null;
  }
}

function readStoredSession(): string | null {
  const store = browserStore();
  const raw = store ? store.getItem(SESSION_STORAGE_KEY) : memoryStore.get(SESSION_STORAGE_KEY);
  return raw && UUID_RE.test(raw) ? raw : null;
}

function writeStoredSession(value: string | null): void {
  const store = browserStore();
  if (value === null) {
    memoryStore.delete(SESSION_STORAGE_KEY);
    store?.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  memoryStore.set(SESSION_STORAGE_KEY, value);
  store?.setItem(SESSION_STORAGE_KEY, value);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function defaultInterval(fn: () => void, ms: number): IntervalHandle {
  const id = setInterval(fn, ms);
  return { cancel: () => clearInterval(id) };
}

function sanitizeFields(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const fields = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const loc = record.loc;
      const errorType = record.error_type;
      if (typeof loc !== "string" || typeof errorType !== "string") {
        return null;
      }
      return { loc, error_type: errorType };
    })
    .filter((item) => item !== null);
  return fields;
}

function sanitizeProperties(
  eventType: string,
  properties: TelemetryProperties,
): TelemetryProperties | null {
  const entry = CATALOG[eventType];
  if (!entry) {
    return null;
  }
  const next: TelemetryProperties = {};
  for (const key of entry.keys) {
    if (!Object.prototype.hasOwnProperty.call(properties, key)) {
      continue;
    }
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      continue;
    }
    const value = properties[key];
    if (key === "fields") {
      const fields = sanitizeFields(value);
      if (fields !== undefined) {
        next.fields = fields;
      }
      continue;
    }
    next[key] = value;
  }
  for (const key of entry.required) {
    if (next[key] === undefined) {
      return null;
    }
  }
  return next;
}

function buildTags(source: string, properties: TelemetryProperties): TelemetryEvent["tags"] {
  const locationScope = properties.location_scope;
  const tags: TelemetryEvent["tags"] = {
    source,
    location_scope: typeof locationScope === "string" ? locationScope : "none",
  };
  for (const key of ["location_id", "country", "currency"] as const) {
    const value = properties[key];
    if (typeof value === "string" && value.length > 0) {
      tags[key] = value;
    }
  }
  return tags;
}

function buildEvent(eventType: string, properties: TelemetryProperties): TelemetryEvent | null {
  const entry = CATALOG[eventType];
  const clean = sanitizeProperties(eventType, properties);
  if (!entry || !clean) {
    return null;
  }
  let nextSession = sessionId;
  let nextUser = userId;
  if (entry.identity === "anonymous") {
    nextSession = null;
    nextUser = null;
  }
  if (entry.identity === "staff" && !nextUser) {
    return null;
  }
  return {
    eventID: uuid(),
    timestamp: captureTimestamp(),
    sessionID: nextSession,
    UserID: nextUser,
    Event_type: eventType,
    SchemaVersion: SCHEMA_VERSION,
    requestID: uuid(),
    source: entry.source,
    tags: buildTags(entry.source, clean),
    properties: clean,
  };
}

async function postBatch(batch: TelemetryEvent[]): Promise<void> {
  const url = endpointUrl();
  if (!url || batch.length === 0) {
    return;
  }
  const send = fetchOverride ?? fetch;
  const sleep = sleepOverride ?? defaultSleep;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await send(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });
      if (!response.ok) {
        throw new Error("telemetry batch was not accepted");
      }
      return;
    } catch {
      if (attempt >= MAX_RETRIES) {
        return;
      }
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }
  }
}

function scheduleSend(batch: TelemetryEvent[]): void {
  sendChain = sendChain.then(() => postBatch(batch)).catch(() => undefined);
}

export function __telemetrySettled(): Promise<void> {
  return sendChain;
}

function flushQueue(): void {
  if (queue.length === 0) {
    return;
  }
  const batch = queue.splice(0, queue.length);
  scheduleSend(batch);
}

function beaconFlush(): void {
  if (queue.length === 0) {
    return;
  }
  const url = endpointUrl();
  const batch = queue.splice(0, queue.length);
  if (!url) {
    return;
  }
  const body = JSON.stringify({ events: batch });
  const sent = beaconOverride
    ? beaconOverride(url, body)
    : defaultBeacon(url, body);
  if (!sent) {
    scheduleSend(batch);
  }
}

function defaultBeacon(url: string, body: string): boolean {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
    return false;
  }
  const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
  return navigator.sendBeacon(url, blob);
}

function onVisibilityChange(): void {
  if (typeof document === "undefined") {
    return;
  }
  if (document.visibilityState === "hidden") {
    beaconFlush();
  }
}

function bindLifecycle(): void {
  if (listenersBound) {
    return;
  }
  listenersBound = true;
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  const start = intervalOverride ?? defaultInterval;
  intervalHandle = start(() => {
    flushQueue();
  }, FLUSH_INTERVAL_MS);
}

/** Mint or keep the tab session and remember the staff users.id. Never an email. */
export function bindStaffSession(nextUserId: string): void {
  if (!/^[0-9]+$/.test(nextUserId)) {
    return;
  }
  sessionEndSent = false;
  userId = nextUserId;
  const existing = readStoredSession();
  if (existing) {
    sessionId = existing;
    return;
  }
  const minted = uuid();
  sessionId = minted;
  writeStoredSession(minted);
}

export function telemetrySessionId(): string | null {
  return sessionId;
}

/** Drop the tab session after the pending queue has been handed to sendBeacon. */
export function clearStaffSession(): void {
  beaconFlush();
  sessionId = null;
  userId = null;
  writeStoredSession(null);
}

/**
 * Only public tracking API. `eventType` is stored as `Event_type`.
 * Callers pass allowlisted properties only. Envelope fields are added here.
 */
/** Queue `session_ended`, then beacon-flush and drop the tab session. Once per session. */
export function endStaffSession(reason: "logout" | "rejected_session"): void {
  if (!sessionEndSent) {
    sessionEndSent = true;
    track("session_ended", { location_scope: "none", reason });
  }
  clearStaffSession();
}

export function track(eventType: string, properties: TelemetryProperties = {}): void {
  const event = buildEvent(eventType, properties);
  if (!event) {
    return;
  }
  bindLifecycle();
  queue.push(event);
  if (queue.length >= MAX_QUEUE_SIZE) {
    flushQueue();
  }
}

export function __pendingCount(): number {
  return queue.length;
}

export function __flushForTests(): void {
  flushQueue();
}

export function __setTelemetryTestHooks(hooks: TestHooks): void {
  if (hooks.endpoint !== undefined) {
    endpointOverride = hooks.endpoint;
  }
  if (hooks.fetchImpl) {
    fetchOverride = hooks.fetchImpl;
  }
  if (hooks.sleepImpl) {
    sleepOverride = hooks.sleepImpl;
  }
  if (hooks.startInterval) {
    intervalOverride = hooks.startInterval;
  }
  if (hooks.sendBeaconImpl) {
    beaconOverride = hooks.sendBeaconImpl;
  }
}

export function __resetTelemetryForTests(): void {
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }
  queue = [];
  sessionId = null;
  userId = null;
  sessionEndSent = false;
  listenersBound = false;
  intervalHandle?.cancel();
  intervalHandle = null;
  sendChain = Promise.resolve();
  endpointOverride = null;
  fetchOverride = null;
  sleepOverride = null;
  intervalOverride = null;
  beaconOverride = null;
  memoryStore.clear();
  writeStoredSession(null);
}
