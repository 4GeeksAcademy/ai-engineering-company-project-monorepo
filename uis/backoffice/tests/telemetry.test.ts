import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  FLUSH_INTERVAL_MS,
  MAX_QUEUE_SIZE,
  SCHEMA_VERSION,
  __flushForTests,
  __pendingCount,
  __resetTelemetryForTests,
  __setTelemetryTestHooks,
  __telemetrySettled,
  bindStaffSession,
  clearStaffSession,
  track,
} from "../src/services/telemetry.ts";

const ENDPOINT = "http://127.0.0.1:8000/telemetry/events";

type Sent = { url: string; body: { events: Array<Record<string, unknown>> } };

const sectionProps = {
  location_scope: "none",
  app: "backoffice",
  section: "login",
  required: false,
  ready: true,
  path: "/login",
};

function listenForVisibility(): { fire: (state: "hidden" | "visible") => void } {
  const handlers = new Set<() => void>();
  const documentMock = {
    visibilityState: "visible" as "hidden" | "visible",
    addEventListener(type: string, handler: () => void) {
      if (type === "visibilitychange") {
        handlers.add(handler);
      }
    },
    removeEventListener(type: string, handler: () => void) {
      if (type === "visibilitychange") {
        handlers.delete(handler);
      }
    },
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentMock,
  });
  return {
    fire(state) {
      documentMock.visibilityState = state;
      for (const handler of handlers) {
        handler();
      }
    },
  };
}

beforeEach(() => {
  __resetTelemetryForTests();
});

afterEach(() => {
  __resetTelemetryForTests();
});

describe("TelemetryService batching", () => {
  it("sends when the queue reaches 20 events", async () => {
    const sent: Sent[] = [];
    __setTelemetryTestHooks({
      endpoint: ENDPOINT,
      fetchImpl: async (url, init) => {
        sent.push({ url: String(url), body: JSON.parse(String(init?.body)) });
        return new Response(JSON.stringify({ received: MAX_QUEUE_SIZE }), { status: 200 });
      },
      startInterval: () => ({ cancel() {} }),
    });

    for (let index = 0; index < MAX_QUEUE_SIZE - 1; index += 1) {
      track("section_viewed", sectionProps);
    }
    assert.equal(sent.length, 0);
    assert.equal(__pendingCount(), 19);

    track("section_viewed", sectionProps);
    await __telemetrySettled();

    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.url, ENDPOINT);
    assert.equal(sent[0]?.body.events.length, 20);
    assert.equal(__pendingCount(), 0);
  });

  it("sends on the 10 second timer when the queue is still under 20", async () => {
    const sent: Sent[] = [];
    let scheduled: { fn: () => void; ms: number } | null = null;
    __setTelemetryTestHooks({
      endpoint: ENDPOINT,
      fetchImpl: async (_url, init) => {
        sent.push({ url: ENDPOINT, body: JSON.parse(String(init?.body)) });
        return new Response("{}", { status: 200 });
      },
      startInterval: (fn, ms) => {
        scheduled = { fn, ms };
        return { cancel() {} };
      },
    });

    track("section_viewed", sectionProps);
    assert.equal(sent.length, 0);
    assert.ok(scheduled);
    assert.equal(scheduled.ms, FLUSH_INTERVAL_MS);
    assert.equal(FLUSH_INTERVAL_MS, 10_000);

    scheduled.fn();
    await __telemetrySettled();
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.body.events.length, 1);
  });
});

describe("TelemetryService retry", () => {
  it("retries three times with exponential backoff, then discards the batch", async () => {
    const delays: number[] = [];
    let calls = 0;
    __setTelemetryTestHooks({
      endpoint: ENDPOINT,
      fetchImpl: async () => {
        calls += 1;
        throw new Error("offline");
      },
      sleepImpl: async (ms) => {
        delays.push(ms);
      },
      startInterval: () => ({ cancel() {} }),
    });

    track("section_viewed", sectionProps);
    __flushForTests();
    await __telemetrySettled();

    assert.equal(calls, 4);
    assert.deepEqual(delays, [200, 400, 800]);
    assert.equal(__pendingCount(), 0);

    calls = 0;
    track("section_viewed", { ...sectionProps, section: "register", path: "/register" });
    __flushForTests();
    await __telemetrySettled();
    assert.equal(calls, 4);
  });

  it("stops retrying when a later attempt succeeds", async () => {
    const delays: number[] = [];
    let calls = 0;
    __setTelemetryTestHooks({
      endpoint: ENDPOINT,
      fetchImpl: async () => {
        calls += 1;
        if (calls < 3) {
          return new Response("no", { status: 503 });
        }
        return new Response(JSON.stringify({ received: 1 }), { status: 200 });
      },
      sleepImpl: async (ms) => {
        delays.push(ms);
      },
      startInterval: () => ({ cancel() {} }),
    });

    track("section_viewed", sectionProps);
    __flushForTests();
    await __telemetrySettled();
    assert.equal(calls, 3);
    assert.deepEqual(delays, [200, 400]);
  });
});

describe("TelemetryService envelope", () => {
  it("adds plan envelope fields and drops properties outside the allowlist", async () => {
    let body: Sent["body"] | null = null;
    __setTelemetryTestHooks({
      endpoint: ENDPOINT,
      fetchImpl: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response("{}", { status: 200 });
      },
      startInterval: () => ({ cancel() {} }),
    });

    bindStaffSession("42");
    track("section_viewed", {
      ...sectionProps,
      email: "hidden@example.com",
      password: "secret",
      name: "Mariana",
    });
    __flushForTests();
    await __telemetrySettled();

    const event = body?.events[0];
    assert.ok(event);
    assert.equal(event.SchemaVersion, SCHEMA_VERSION);
    assert.equal(event.Event_type, "section_viewed");
    assert.equal(event.UserID, "42");
    assert.match(String(event.eventID), /^[0-9a-f-]{36}$/i);
    assert.match(String(event.sessionID), /^[0-9a-f-]{36}$/i);
    assert.match(String(event.requestID), /^[0-9a-f-]{36}$/i);
    assert.match(String(event.timestamp), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.equal(event.source, "uis.backoffice");
    assert.equal((event.tags as { source: string }).source, "uis.backoffice");
    const properties = event.properties as Record<string, unknown>;
    assert.equal(properties.section, "login");
    assert.equal(properties.email, undefined);
    assert.equal(properties.password, undefined);
    assert.equal(properties.name, undefined);
    assert.equal(event.eventId, undefined);
    assert.equal(event.event_type, undefined);
  });

  it("keeps sessionID in session memory until logout clears it", async () => {
    __setTelemetryTestHooks({
      endpoint: ENDPOINT,
      fetchImpl: async () => new Response("{}", { status: 200 }),
      startInterval: () => ({ cancel() {} }),
      sendBeaconImpl: () => true,
    });
    bindStaffSession("7");
    track("section_viewed", sectionProps);
    const first = __pendingCount();
    assert.equal(first, 1);
    bindStaffSession("7");
    track("section_viewed", { ...sectionProps, section: "register", path: "/register" });
    __flushForTests();
    await __telemetrySettled();
    clearStaffSession();
    track("user_login_failed", {
      location_scope: "none",
      method: "json",
      route: "/auth/login",
      failure_reason: "invalid_credentials",
    });
    let failed: Record<string, unknown> | null = null;
    __setTelemetryTestHooks({
      fetchImpl: async (_url, init) => {
        failed = JSON.parse(String(init?.body)).events[0];
        return new Response("{}", { status: 200 });
      },
    });
    __flushForTests();
    await __telemetrySettled();
    assert.equal(failed?.sessionID, null);
    assert.equal(failed?.UserID, null);
  });
});

describe("TelemetryService sendBeacon", () => {
  it("flushes with sendBeacon when the document becomes hidden", () => {
    const visibility = listenForVisibility();
    const beacons: string[] = [];
    __resetTelemetryForTests();
    __setTelemetryTestHooks({
      endpoint: ENDPOINT,
      startInterval: () => ({ cancel() {} }),
      sendBeaconImpl: (_url, body) => {
        beacons.push(body);
        return true;
      },
    });

    track("section_viewed", sectionProps);
    visibility.fire("visible");
    assert.equal(beacons.length, 0);
    assert.equal(__pendingCount(), 1);

    visibility.fire("hidden");
    assert.equal(beacons.length, 1);
    const payload = JSON.parse(beacons[0] ?? "{}") as { events: unknown[] };
    assert.equal(payload.events.length, 1);
    assert.equal(__pendingCount(), 0);
  });
});
