import { describe, expect, it, vi } from "vitest";
import { findAccount, loadCustomer, loadSales, resolveDataSource } from "../src/lib/api";
import { FIXTURE_CUSTOMERS, FIXTURE_SALES } from "../src/lib/fixtures";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("data source switch", () => {
  it("stays on fixtures unless the env var is live", () => {
    expect(resolveDataSource({})).toBe("mock");
    expect(resolveDataSource({ BRASALAND_DATA_SOURCE: "mock" })).toBe("mock");
    expect(resolveDataSource({ BRASALAND_DATA_SOURCE: "LIVE" })).toBe("live");
    expect(resolveDataSource({ NEXT_PUBLIC_BRASALAND_DATA_SOURCE: "live" })).toBe("live");
  });

  it("does not call the network in fixture mode", async () => {
    const fetchImpl = vi.fn();
    const sales = await loadSales({ env: { BRASALAND_DATA_SOURCE: "mock" }, fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(sales.source).toBe("mock");
    expect(sales.data).toHaveLength(FIXTURE_SALES.length);
  });

  it("reads GET /sales and sends the staff token only as a bearer header", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer staff-token");
      return jsonResponse([
        { location_id: "us-miami-test", location_name: "Miami Test", currency: "USD", amount_local: 12, amount_cop: 48000, amount_usd: 12 },
      ]);
    });
    const sales = await loadSales({
      env: {
        BRASALAND_DATA_SOURCE: "live",
        BRASALAND_API_BASE_URL: "http://127.0.0.1:8000",
        BRASALAND_API_TOKEN: "staff-token",
      },
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/sales",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(sales.source).toBe("live");
    expect(sales.data[0]?.locationId).toBe("us-miami-test");
    expect(sales.data[0]?.currency).toBe("USD");
  });

  it("falls back to fixtures when the live sales call fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("connection refused");
    });
    const sales = await loadSales({
      env: { BRASALAND_DATA_SOURCE: "live", BRASALAND_API_BASE_URL: "http://127.0.0.1:8000" },
      fetchImpl,
    });
    expect(sales.source).toBe("mock");
    expect(sales.notice).toMatch(/fixture/i);
    expect(sales.data).toHaveLength(14);
  });

  it("does not replace a live 404 with a fixture guest", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).endsWith("/customers/missing")) return jsonResponse({ detail: "nope" }, 404);
      return jsonResponse([]);
    });
    const result = await loadCustomer("missing", {
      env: { BRASALAND_DATA_SOURCE: "live" },
      fetchImpl,
    });
    expect(result.source).toBe("live");
    expect(result.data).toBeNull();
  });

  it("looks up a fixture guest by email", () => {
    const found = findAccount(FIXTURE_CUSTOMERS, "ANA.MORALES@guest.brasaland.example");
    expect(found?.id).toBe("cus-001");
  });
});
