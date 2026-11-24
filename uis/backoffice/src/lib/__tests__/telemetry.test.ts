import { BASE_BACKOFF_MS, FLUSH_INTERVAL_MS, MAX_BATCH_SIZE, MAX_RETRIES } from "@/lib/telemetryConfig";

const URL = "http://localhost:8000/telemetry/events";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const fetchMock = jest.fn();
// jsdom has no Response: the service only reads `ok` and `status`.
const reply = (status: number) => ({ ok: status >= 200 && status < 300, status });
const beaconMock = jest.fn();

type Service = { track: (type: string, properties: Record<string, unknown>) => void };
let service: Service;
let auth: typeof import("@/lib/auth");
let requestContext: typeof import("@/lib/requestContext");

function jwt(claims: object): string {
  return `h.${btoa(JSON.stringify(claims))}.s`;
}

function load(endpoint: string | null = URL) {
  if (endpoint === null) delete process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT;
  else process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT = endpoint;
  // A fresh copy of the modules per test: the service keeps its queue and timers at module level.
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    service = require("@/lib/telemetry");
    auth = require("@/lib/auth");
    requestContext = require("@/lib/requestContext");
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
}

function sentBatches(): { events: Record<string, unknown>[] }[] {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
}

function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

// Each test loads a fresh copy of the service; its document/window listeners must not outlive it.
const listeners: [EventTarget, string, EventListener][] = [];
for (const target of [document, window]) {
  const original = target.addEventListener.bind(target);
  target.addEventListener = ((type: string, listener: EventListener, options?: boolean) => {
    listeners.push([target, type, listener]);
    original(type, listener, options);
  }) as typeof target.addEventListener;
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset().mockResolvedValue(reply(200));
  beaconMock.mockReset().mockReturnValue(true);
  global.fetch = fetchMock;
  Object.defineProperty(navigator, "sendBeacon", { value: beaconMock, configurable: true });
  window.localStorage.clear();
  window.sessionStorage.clear();
  setVisibility("visible");
  load();
});

afterEach(() => {
  for (const [target, type, listener] of listeners.splice(0)) target.removeEventListener(type, listener);
  jest.useRealTimers();
});

describe("track: envelope", () => {
  it("stamps every standard field, so callers pass only properties", async () => {
    service.track("page_viewed", { route_template: "/inventory/products" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    const [event] = sentBatches()[0].events;
    expect(Object.keys(event).sort()).toEqual(
      ["eventId", "event_type", "properties", "requestId", "schemaVersion", "sessionId", "source", "timestamp", "userId"],
    );
    expect(event).toMatchObject({ event_type: "page_viewed", schemaVersion: "1.0.0", source: "frontend", userId: "anonymous" });
    expect(event.eventId).toMatch(UUID_V4);
    expect(event.requestId).toMatch(UUID_V4);
    expect(event.sessionId).toMatch(UUID_V4);
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(event.properties).toEqual({ route_template: "/inventory/products" });
  });

  it("timestamps at capture, not at send", async () => {
    jest.setSystemTime(new Date("2026-11-24T10:00:00.000Z"));
    service.track("page_viewed", { route_template: "/" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sentBatches()[0].events[0].timestamp).toBe("2026-11-24T10:00:00.000Z");
  });

  it("uses the user id (sub) of the signed-in token", async () => {
    window.localStorage.setItem("nexova.accessToken", jwt({ sub: "usr_42", exp: 9999999999 }));
    service.track("page_viewed", { route_template: "/" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sentBatches()[0].events[0].userId).toBe("usr_42");
  });

  it("keeps one session id per tab and uses a fresh requestId per event", async () => {
    service.track("page_viewed", { route_template: "/a" });
    service.track("page_viewed", { route_template: "/b" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    const [a, b] = sentBatches()[0].events;
    expect(a.sessionId).toBe(b.sessionId);
    expect(a.requestId).not.toBe(b.requestId);
  });

  it("reuses the id of the API call that just finished, then stops", async () => {
    requestContext.publishRequestId("11111111-1111-4111-8111-111111111111");
    service.track("outbound_order_created", { order_id: 1 });
    await jest.advanceTimersByTimeAsync(0);
    service.track("page_viewed", { route_template: "/" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    const [first, second] = sentBatches()[0].events;
    expect(first.requestId).toBe("11111111-1111-4111-8111-111111111111");
    expect(second.requestId).not.toBe(first.requestId);
  });

  it("drops undefined values and keys that could carry personal data", async () => {
    service.track("outbound_order_created", { order_id: 1, programme_id: undefined, email: "a@b.c", assigned_to: "Ana", password: "x", has_assignee: true });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sentBatches()[0].events[0].properties).toEqual({ order_id: 1, has_assignee: true });
  });
});

describe("track: batching", () => {
  it("sends nothing until 10 s have passed, then one request with everything queued", async () => {
    service.track("page_viewed", { route_template: "/a" });
    service.track("form_started", { form_id: "inbound_order" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBatches()[0].events.map((e) => e.event_type)).toEqual(["page_viewed", "form_started"]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(URL);
    expect(init).toMatchObject({ method: "POST", keepalive: true });
  });

  it("sends at once, as one request, when the queue reaches 20 events", () => {
    for (let i = 0; i < MAX_BATCH_SIZE - 1; i++) service.track("form_started", { form_id: "inbound_order" });
    expect(fetchMock).not.toHaveBeenCalled();
    service.track("form_started", { form_id: "inbound_order" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBatches()[0].events).toHaveLength(MAX_BATCH_SIZE);
  });

  it("never sends one request per event", async () => {
    for (let i = 0; i < 7; i++) service.track("list_load_more_clicked", { list_id: "incidents", pages_shown: i });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing without NEXT_PUBLIC_TELEMETRY_ENDPOINT", async () => {
    load(null);
    service.track("page_viewed", { route_template: "/" });
    setVisibility("hidden");
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(beaconMock).not.toHaveBeenCalled();
  });
});

describe("track: reliable flush", () => {
  it("hands pending events to sendBeacon when the tab is hidden", async () => {
    service.track("page_viewed", { route_template: "/" });
    setVisibility("hidden");
    expect(beaconMock).toHaveBeenCalledTimes(1);
    const [url, body] = beaconMock.mock.calls[0];
    expect(url).toBe(URL);
    expect(body).toBeInstanceOf(Blob);
    expect(body.type).toMatch(/^text\/plain/); // no CORS preflight
    expect(JSON.parse(await readBlob(body)).events).toHaveLength(1);
    // Already sent: the timer must not send it a second time.
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("flushes on pagehide too, and not when the tab becomes visible", () => {
    service.track("page_viewed", { route_template: "/" });
    setVisibility("visible");
    expect(beaconMock).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("pagehide"));
    expect(beaconMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to a keepalive request if sendBeacon refuses", () => {
    beaconMock.mockReturnValue(false);
    service.track("page_viewed", { route_template: "/" });
    setVisibility("hidden");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ keepalive: true });
  });

  it("sends nothing when the queue is empty", () => {
    service.track("page_viewed", { route_template: "/" });
    setVisibility("hidden");
    beaconMock.mockClear();
    setVisibility("hidden");
    expect(beaconMock).not.toHaveBeenCalled();
  });
});

describe("track: retries with backoff", () => {
  it("retries 3 times at 1 s, 2 s and 4 s, then drops the batch", async () => {
    fetchMock.mockRejectedValue(new TypeError("network"));
    service.track("page_viewed", { route_template: "/" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (let retry = 1; retry <= MAX_RETRIES; retry++) {
      await jest.advanceTimersByTimeAsync(BASE_BACKOFF_MS * 2 ** (retry - 1) - 1);
      expect(fetchMock).toHaveBeenCalledTimes(retry);
      await jest.advanceTimersByTimeAsync(1);
      expect(fetchMock).toHaveBeenCalledTimes(retry + 1);
    }
    await jest.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1 + MAX_RETRIES); // dropped
  });

  it("retries 5xx, and stops as soon as a retry succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(reply(503))
      .mockResolvedValueOnce(reply(200));
    service.track("page_viewed", { route_template: "/" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS + BASE_BACKOFF_MS + 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a payload the server rejected (422)", async () => {
    fetchMock.mockResolvedValue(reply(422));
    service.track("page_viewed", { route_template: "/" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS + 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends a batch that was waiting for a retry with sendBeacon when the page closes", async () => {
    fetchMock.mockRejectedValue(new TypeError("network"));
    service.track("page_viewed", { route_template: "/" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    setVisibility("hidden");
    expect(beaconMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1); // its retry timer was cancelled
  });

  it("never throws into the app", () => {
    fetchMock.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => {
      service.track("page_viewed", { route_template: "/" });
      setVisibility("hidden");
    }).not.toThrow();
  });
});

describe("track: sessions and rate limits", () => {
  it("rotates the session id after logout, but not at login", async () => {
    service.track("login_failed", { reason: "bad_credentials" });
    window.localStorage.setItem("nexova.accessToken", jwt({ sub: "u1", exp: 9999999999 }));
    auth.setToken(jwt({ sub: "u1", exp: 9999999999 }));
    service.track("login_succeeded", { method: "password" });
    auth.clearToken();
    service.track("page_viewed", { route_template: "/login" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    const events = sentBatches().flatMap((batch) => batch.events);
    const ids = events.map((event) => event.sessionId);
    expect(ids[0]).toBe(ids[1]); // failed attempt and its success share the session
    expect(ids[2]).not.toBe(ids[1]);
  });

  it("emits the same page view only once per second", async () => {
    service.track("page_viewed", { route_template: "/a" });
    service.track("page_viewed", { route_template: "/a" });
    await jest.advanceTimersByTimeAsync(1_000);
    service.track("page_viewed", { route_template: "/a" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sentBatches().flatMap((b) => b.events)).toHaveLength(2);
  });

  it("keeps at most 1 api_request_failed per route and kind every 30 s", async () => {
    const failed = { route_template: "/inventory/products", kind: "network" };
    service.track("api_request_failed", failed);
    service.track("api_request_failed", failed);
    service.track("api_request_failed", { ...failed, kind: "timeout" });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sentBatches().flatMap((b) => b.events)).toHaveLength(2);
  });

  it("caps frontend_error_captured at 20 per session", async () => {
    for (let i = 0; i < 30; i++) service.track("frontend_error_captured", { fingerprint: `fp${i}` });
    await jest.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);
    expect(sentBatches().flatMap((b) => b.events)).toHaveLength(20);
  });
});
