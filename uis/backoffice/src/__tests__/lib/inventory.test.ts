/**
 * @jest-environment node
 */
// The inventory API client (`lib/inventory.ts`): every call goes to the right /inventory endpoint with the bearer
// token, sends the body the API expects, and reports a 4xx/5xx with the message of the response body. It asserts
// behaviour, not encoding: the screens that use it are covered in views/ and by the Playwright script.
//
// Node environment for the real fetch / Response / Headers (jsdom lacks them), with an in-memory localStorage.
//
// Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
import { ApiError, jsonRequest } from "@/lib/api";
import { createAsset, createInboundOrder, createOutboundOrder, getAsset, listAssets, listOrders } from "@/lib/inventory";
import { clearToken, setToken } from "@/lib/token";

class MemoryStorage {
  private items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

const fetchMock = jest.fn();

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true, writable: true });
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => clearToken());

const jsonResponse = (body: unknown, status = 200, statusText = "") =>
  new Response(JSON.stringify(body), { status, statusText, headers: { "Content-Type": "application/json" } });

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit | undefined];
  return { url, init: init ?? {}, headers: new Headers(init?.headers) };
};

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error("expected the promise to reject");
}

const ASSET = { id: 5, name: "Resma de papel A4", sku: "NXV-OFF-001", category: "office_supplies", office: "Valencia", current_stock: 80 };

describe("inventory client", () => {
  describe("happy path", () => {
    it("reads the assets from GET /inventory/products with the bearer token", async () => {
      setToken("tok-123");
      fetchMock.mockResolvedValue(jsonResponse([ASSET]));

      const assets = await listAssets();

      expect(assets).toEqual([ASSET]);
      const { url, headers, init } = lastCall();
      expect(url).toBe("/api/inventory/products"); // /api/inventory/* is forwarded to /inventory/* (next.config.mjs)
      expect(headers.get("Authorization")).toBe("Bearer tok-123");
      expect(init.method).toBeUndefined();
    });

    it("reads one asset and its stock from GET /inventory/products/{id}", async () => {
      fetchMock.mockResolvedValue(jsonResponse(ASSET));

      await getAsset(5);

      expect(lastCall().url).toBe("/api/inventory/products/5");
    });

    it("reads the history from GET /inventory/orders", async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));

      await listOrders();

      expect(lastCall().url).toBe("/api/inventory/orders");
    });

    it("posts an entry to /inventory/orders/inbound as JSON", async () => {
      setToken("tok-123");
      fetchMock.mockResolvedValue(jsonResponse({ type: "inbound", id: 1 }, 201));
      const payload = { asset_id: 5, quantity: 10, supplier: "Office Depot Miami", office: "Valencia" as const };

      await createInboundOrder(payload);

      const { url, init, headers } = lastCall();
      expect(url).toBe("/api/inventory/orders/inbound");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual(payload);
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(headers.get("Authorization")).toBe("Bearer tok-123");
    });

    it("posts an exit to /inventory/orders/outbound as JSON", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ type: "outbound", id: 1 }, 201));
      const payload = { asset_id: 5, quantity: 2, exit_type: "consumption" as const, assigned_to: null, office: "Valencia" as const };

      await createOutboundOrder(payload);

      const { url, init } = lastCall();
      expect(url).toBe("/api/inventory/orders/outbound");
      expect(JSON.parse(init.body as string)).toEqual(payload);
    });

    it("posts a new asset to /inventory/products", async () => {
      fetchMock.mockResolvedValue(jsonResponse(ASSET, 201));

      await createAsset({ name: ASSET.name, sku: ASSET.sku, category: "office_supplies", office: "Valencia" });

      expect(lastCall().url).toBe("/api/inventory/products");
      expect(lastCall().init.method).toBe("POST");
    });
  });

  describe("edge cases", () => {
    it("calls the API directly, on /inventory/*, when NEXT_PUBLIC_API_BASE_URL points to another domain", async () => {
      jest.resetModules();
      process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
      try {
        const { listAssets: listDirect } = await import("@/lib/inventory");
        fetchMock.mockResolvedValue(jsonResponse([ASSET]));

        await listDirect();

        expect(lastCall().url).toBe("https://api.example.test/inventory/products");
      } finally {
        delete process.env.NEXT_PUBLIC_API_BASE_URL;
        jest.resetModules();
      }
    });

    it("uses the inventory's own host in direct mode when NEXT_PUBLIC_INVENTORY_API_URL is set", async () => {
      jest.resetModules();
      process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
      process.env.NEXT_PUBLIC_INVENTORY_API_URL = "https://inventory.example.test/";
      try {
        const { listAssets: listDirect } = await import("@/lib/inventory");
        fetchMock.mockResolvedValue(jsonResponse([ASSET]));

        await listDirect();

        expect(lastCall().url).toBe("https://inventory.example.test/inventory/products");
      } finally {
        delete process.env.NEXT_PUBLIC_API_BASE_URL;
        delete process.env.NEXT_PUBLIC_INVENTORY_API_URL;
        jest.resetModules();
      }
    });

    it("keeps the headers a caller passes, whatever their form (Headers, array or object)", async () => {
      fetchMock.mockImplementation(async () => jsonResponse({})); // a Response body can be read only once

      await jsonRequest("/x", { method: "POST", body: "{}", headers: new Headers({ "X-Trace": "1" }) });
      expect(lastCall().headers.get("X-Trace")).toBe("1");
      expect(lastCall().headers.get("Content-Type")).toBe("application/json");

      await jsonRequest("/x", { headers: [["X-Trace", "2"]] });
      expect(lastCall().headers.get("X-Trace")).toBe("2");
    });

    it("sends no Authorization header when there is no session (the API answers 401)", async () => {
      fetchMock.mockResolvedValue(jsonResponse([ASSET]));

      await listAssets();

      expect(lastCall().headers.has("Authorization")).toBe(false);
    });
  });

  describe("failure modes", () => {
    it("throws an ApiError with the message of the body on a 400, never returning the body as data", async () => {
      const detail = "Insufficient stock for asset 'Resma de papel A4'. Available: 3, requested: 10.";
      fetchMock.mockResolvedValue(jsonResponse({ detail }, 400, "Bad Request"));

      const error = await rejection(createOutboundOrder({ asset_id: 5, quantity: 10, exit_type: "consumption", assigned_to: null, office: "Valencia" }));

      expect(error).toBeInstanceOf(ApiError);
      expect([error.status, error.message]).toEqual([400, detail]);
    });

    it("throws an ApiError on a 500", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: "Database is locked" }, 500, "Internal Server Error"));

      const error = await rejection(listAssets());

      expect([error.status, error.message]).toEqual([500, "Database is locked"]);
    });

    it("throws an ApiError of status 0 when the API cannot be reached", async () => {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

      const error = await rejection(listOrders());

      expect(error.status).toBe(0);
    });

    it("ends the session on a 401: the token is forgotten", async () => {
      setToken("old");
      fetchMock.mockResolvedValue(jsonResponse({ detail: "Not authenticated" }, 401));

      await rejection(listAssets());

      expect(globalThis.localStorage.getItem("nexova.token")).toBeNull();
    });
  });
});
