/**
 * @jest-environment node
 */
// The supplier and incident clients (`lib/api.ts`) share `jsonRequest` with the inventory client. These tests pin what
// they send, so that the shared helper cannot change their behaviour unnoticed: URL, method, bearer token, JSON body
// (only when there is one) and the error of a failed call.
//
// Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
import {
  ApiError,
  changeIncidentStatus,
  createSupplier,
  getIncident,
  listIncidents,
  listSuppliers,
  setSupplierStatus,
  updateSupplierRate,
} from "@/lib/api";
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
  fetchMock.mockReset().mockImplementation(async () => new Response("{}", { status: 200 }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  setToken("tok-1");
});

afterAll(() => clearToken());

const last = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
};

describe("supplier client", () => {
  describe("happy path", () => {
    it("lists with a GET, the bearer token and no body or content type", async () => {
      await listSuppliers();

      const { url, init, headers } = last();
      expect(url).toBe("/api/suppliers");
      expect(init.method).toBeUndefined();
      expect(headers.get("Authorization")).toBe("Bearer tok-1");
      expect(headers.has("Content-Type")).toBe(false);
    });

    it("creates with a JSON body", async () => {
      const payload = {
        name: "Acme",
        country: "Spain" as const,
        categories: ["job_boards" as const],
        monthly_rate: 10,
        currency: "EUR" as const,
        status: "active" as const,
        contract_renewal_date: null,
        contact_email: null,
        notes: null,
      };

      await createSupplier(payload);

      const { url, init, headers } = last();
      expect([url, init.method]).toEqual(["/api/suppliers", "POST"]);
      expect(JSON.parse(init.body as string)).toEqual(payload);
      expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("patches the rate and the status of one supplier", async () => {
      await updateSupplierRate(3, 99);
      expect([last().url, last().init.method, JSON.parse(last().init.body as string)]).toEqual([
        "/api/suppliers/3/rate",
        "PATCH",
        { monthly_rate: 99 },
      ]);

      await setSupplierStatus(3, "suspended");
      expect([last().url, JSON.parse(last().init.body as string)]).toEqual(["/api/suppliers/3/status", { status: "suspended" }]);
    });
  });

  describe("failure modes", () => {
    it("throws an ApiError with the message of the body", async () => {
      fetchMock.mockImplementation(async () => new Response(JSON.stringify({ detail: "Supplier 9 not found" }), { status: 404 }));

      await expect(updateSupplierRate(9, 1)).rejects.toMatchObject({ status: 404, message: "Supplier 9 not found" });
      await expect(updateSupplierRate(9, 1)).rejects.toBeInstanceOf(ApiError);
    });
  });
});

describe("incident client", () => {
  describe("happy path", () => {
    it("reads one incident, encoding the id", async () => {
      await getIncident("INC 1/2");

      expect(last().url).toBe("/api/incidents/INC%201%2F2");
      expect(last().headers.get("Authorization")).toBe("Bearer tok-1");
    });

    it("lists with the filters and paging in the query string", async () => {
      const filters = { status: ["open"], category: [], origin: [], branch: "", agent_id: "", client_company: "", q: "vpn", date_from: "", date_to: "" };

      await listIncidents(filters as never, { sort: "created_at", order: "desc", page: 2, pageSize: 25 });

      const url = new URL(last().url, "http://x");
      expect(url.pathname).toBe("/api/incidents");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        status: "open",
        q: "vpn",
        sort: "created_at",
        order: "desc",
        page: "2",
        page_size: "25",
      });
    });

    it("changes a status with a PATCH and a JSON body", async () => {
      await changeIncidentStatus("INC-1", { status: "resolved", note: "ok" } as never);

      const { url, init, headers } = last();
      expect([url, init.method]).toEqual(["/api/incidents/INC-1/status", "PATCH"]);
      expect(JSON.parse(init.body as string)).toEqual({ status: "resolved", note: "ok" });
      expect(headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("failure modes", () => {
    it("throws an ApiError on a 409", async () => {
      fetchMock.mockImplementation(async () => new Response(JSON.stringify({ detail: "Already closed" }), { status: 409 }));

      await expect(changeIncidentStatus("INC-1", { status: "open" } as never)).rejects.toMatchObject({
        status: 409,
        message: "Already closed",
      });
    });
  });
});
