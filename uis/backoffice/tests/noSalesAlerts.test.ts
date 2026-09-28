import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  consumeSseBuffer,
  defaultSaleAmount,
  parseSseBlock,
  reconnectDelayMs,
  reduceOpsAlerts,
  toastForFrame,
  type OpsAlert,
  type ParsedSse,
} from "../src/lib/noSalesAlerts.ts";

const medellin: OpsAlert = {
  location_id: "co-med-centro",
  location_name: "Medellín Centro",
  city: "Medellín",
  region: "Colombia",
  country: "Colombia",
  currency: "COP",
  window_minutes: 30,
  quiet_minutes: 31,
  last_sale_at: null,
  detected_at: "2026-09-28T23:00:00Z",
  timezone: "America/Bogota",
  business_hours: "11:00-22:00",
  message: "Medellín Centro has recorded no sales for 31 minutes during opening hours.",
};

function frame(event: string, data: Record<string, unknown>, id: string | null = null): ParsedSse {
  return { id, event, data };
}

describe("no-sales alert state", () => {
  it("replaces the list from a snapshot", () => {
    const next = reduceOpsAlerts([medellin], frame("ops_alert_snapshot", { alerts: [] }));
    assert.deepEqual(next, []);
  });

  it("adds an alert and clears it when sales resume", () => {
    const raised = reduceOpsAlerts([], frame("no_sales_alert", medellin, "1"));
    assert.equal(raised.length, 1);
    assert.equal(raised[0]?.currency, "COP");
    const again = reduceOpsAlerts(raised, frame("no_sales_alert", { ...medellin, quiet_minutes: 40 }, "2"));
    assert.equal(again.length, 1);
    assert.equal(again[0]?.quiet_minutes, 40);
    const cleared = reduceOpsAlerts(again, frame("no_sales_cleared", { location_id: "co-med-centro" }, "3"));
    assert.deepEqual(cleared, []);
  });

  it("ignores sale frames", () => {
    const next = reduceOpsAlerts([medellin], frame("sale_recorded", { location_id: "co-med-centro" }));
    assert.equal(next.length, 1);
  });

  it("builds toast copy for raise and clear", () => {
    assert.equal(toastForFrame(frame("no_sales_alert", medellin))?.tone, "alert");
    assert.match(toastForFrame(frame("no_sales_cleared", { location_name: "Miami Brickell" }))?.text ?? "", /Miami Brickell/);
    assert.equal(toastForFrame(frame("sale_recorded", {})), null);
  });
});

describe("SSE parsing", () => {
  it("parses a named event and ignores keep-alive comments", () => {
    const raw = ": keep-alive\n\nid: 4\nevent: no_sales_alert\ndata: {\"location_id\":\"us-tampa\",\"currency\":\"USD\"}\n\n";
    const { events, rest } = consumeSseBuffer(raw);
    assert.equal(rest, "");
    assert.equal(events.length, 1);
    assert.equal(events[0]?.id, "4");
    assert.equal(events[0]?.event, "no_sales_alert");
    assert.equal(events[0]?.data.currency, "USD");
    assert.equal(parseSseBlock(": keep-alive\n"), null);
  });

  it("keeps a partial block in the rest buffer", () => {
    const { events, rest } = consumeSseBuffer("event: no_sales_cleared\ndata: {\"location_id\":\"co-pereira\"}");
    assert.deepEqual(events, []);
    assert.match(rest, /co-pereira/);
  });
});

describe("reconnect and currency defaults", () => {
  it("backs off from 1s toward 30s", () => {
    assert.equal(reconnectDelayMs(1), 1000);
    assert.equal(reconnectDelayMs(2), 2000);
    assert.equal(reconnectDelayMs(6), 30000);
  });

  it("picks COP and USD sample tickets", () => {
    assert.equal(defaultSaleAmount("COP"), "48000");
    assert.equal(defaultSaleAmount("USD"), "36.00");
  });
});
