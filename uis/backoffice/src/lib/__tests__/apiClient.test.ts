/** @jest-environment node */
import { apiFetch, apiJson, apiUrl, routeTemplate } from "@/lib/apiClient";
import { track } from "@/lib/telemetry";
import * as auth from "@/lib/auth";
import { ApiError } from "@/lib/errors";

jest.mock("@/lib/auth", () => ({
  getToken: jest.fn(),
  clearToken: jest.fn(),
  redirectToLogin: jest.fn(),
}));

jest.mock("@/lib/telemetry", () => ({ track: jest.fn() }));
const trackMock = track as jest.Mock;

const fetchMock = jest.fn();
const getToken = auth.getToken as jest.Mock;

function reply(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init: init as RequestInit, headers: init.headers as Headers };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock;
  getToken.mockReturnValue(null);
});

describe("apiUrl", () => {
  it("routes API paths through the /api proxy without doubling the prefix", () => {
    expect(apiUrl("/suppliers")).toBe("/api/suppliers");
    expect(apiUrl("/api/incidents/analyze")).toBe("/api/incidents/analyze");
  });
});

describe("apiFetch", () => {
  it("adds the Bearer token to protected calls", async () => {
    getToken.mockReturnValue("tok123");
    fetchMock.mockResolvedValue(reply(200, {}));
    await apiFetch("/auth/me");
    expect(lastRequest().headers.get("Authorization")).toBe("Bearer tok123");
  });

  it("sends no Authorization header without a token or when auth is false", async () => {
    fetchMock.mockResolvedValue(reply(200, {}));
    await apiFetch("/auth/me");
    expect(lastRequest().headers.has("Authorization")).toBe(false);
    getToken.mockReturnValue("tok123");
    await apiFetch("/auth/login", { auth: false });
    expect(lastRequest().headers.has("Authorization")).toBe(false);
  });

  it("serialises `json` bodies with the JSON content type", async () => {
    fetchMock.mockResolvedValue(reply(200, {}));
    await apiFetch("/users", { method: "POST", json: { email: "a@b.com" } });
    expect(lastRequest().init.body).toBe('{"email":"a@b.com"}');
    expect(lastRequest().headers.get("Content-Type")).toBe("application/json");
  });

  it("on 401 clears the token, redirects to login and throws a session-expired error", async () => {
    getToken.mockReturnValue("expired");
    fetchMock.mockResolvedValue(reply(401, { detail: "Invalid or expired token" }));
    await expect(apiFetch("/auth/me")).rejects.toMatchObject({ status: 401 });
    expect(auth.clearToken).toHaveBeenCalledTimes(1);
    expect(auth.redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it("does not end the session on a 401 from an unauthenticated call (wrong password)", async () => {
    fetchMock.mockResolvedValue(reply(401, { detail: "Incorrect email or password" }));
    await expect(apiFetch("/auth/login", { auth: false })).rejects.toMatchObject({ status: 401 });
    expect(auth.clearToken).not.toHaveBeenCalled();
    expect(auth.redirectToLogin).not.toHaveBeenCalled();
  });

  it("turns a network failure into an ApiError of kind network", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/suppliers")).rejects.toMatchObject({ status: 0, kind: "network" });
  });

  it("turns an abort by timeout into an ApiError of kind timeout", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(apiFetch("/suppliers")).rejects.toMatchObject({ kind: "timeout" });
  });

  it("maps FastAPI 422 issues to per-field Spanish messages and never shows server text", async () => {
    fetchMock.mockResolvedValue(
      reply(422, { detail: [{ loc: ["body", "password"], msg: "String should have at least 8 characters", type: "string_too_short", ctx: { min_length: 8 } }] }),
    );
    const error = await apiFetch("/users", { method: "POST", json: {}, labels: { password: "Contraseña" } }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.fieldErrors).toEqual({ password: "Debe tener al menos 8 caracteres" });
    expect(error.message).toBe("Contraseña: Debe tener al menos 8 caracteres");
  });

  it("replaces a non-validation error body with a message for the status", async () => {
    fetchMock.mockResolvedValue(reply(500, { detail: "Traceback (most recent call last)" }));
    const error = await apiFetch("/suppliers").catch((e) => e);
    expect(error.status).toBe(500);
    expect(error.message).not.toContain("Traceback");
  });

  it("tolerates a non-JSON error body", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(apiFetch("/suppliers")).rejects.toMatchObject({ status: 502 });
  });
});

describe("apiJson", () => {
  it("parses a JSON body", async () => {
    fetchMock.mockResolvedValue(reply(200, { email: "a@b.com" }));
    await expect(apiJson("/auth/me")).resolves.toEqual({ email: "a@b.com" });
  });

  it("returns undefined for 204 No Content", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiJson("/users/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("raises a parse ApiError when a 200 body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 200 }));
    await expect(apiJson("/auth/me")).rejects.toMatchObject({ kind: "parse" });
  });
});

describe("telemetry", () => {
  it("sends a fresh X-Request-Id on every call", async () => {
    fetchMock.mockResolvedValue(reply(200, {}));
    await apiFetch("/suppliers");
    const first = lastRequest().headers.get("X-Request-Id");
    await apiFetch("/suppliers");
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(lastRequest().headers.get("X-Request-Id")).not.toBe(first);
  });

  it("reports a network failure as api_request_failed with the route template, never the URL", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/inventory/products/12?office=Valencia")).rejects.toBeInstanceOf(ApiError);
    expect(trackMock).toHaveBeenCalledWith("api_request_failed", {
      http_method: "GET", route_template: "/inventory/products/{id}", kind: "network", http_status: 0, duration_ms: expect.any(Number),
    });
  });

  it("reports a 5xx but not an ordinary 4xx", async () => {
    fetchMock.mockResolvedValue(reply(503));
    await expect(apiFetch("/suppliers", { method: "post" })).rejects.toBeInstanceOf(ApiError);
    expect(trackMock).toHaveBeenCalledWith("api_request_failed", expect.objectContaining({ http_method: "POST", kind: "http", http_status: 503 }));
    trackMock.mockClear();
    fetchMock.mockResolvedValue(reply(404, { detail: "nope" }));
    await expect(apiFetch("/suppliers/9")).rejects.toBeInstanceOf(ApiError);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("reports a 401 on a protected call as session_expired, before clearing the token", async () => {
    fetchMock.mockResolvedValue(reply(401));
    const order: string[] = [];
    trackMock.mockImplementation((type: string) => order.push(type));
    (auth.clearToken as jest.Mock).mockImplementation(() => order.push("clearToken"));
    await expect(apiFetch("/suppliers")).rejects.toBeInstanceOf(ApiError);
    expect(order).toEqual(["session_expired", "clearToken"]);
    expect(trackMock).toHaveBeenCalledWith("session_expired", { route_template: "/", had_unsaved_form: false });
  });

  it("does not report a 401 on an unauthenticated call (login) as an expired session", async () => {
    fetchMock.mockResolvedValue(reply(401));
    await expect(apiFetch("/auth/login", { auth: false })).rejects.toBeInstanceOf(ApiError);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("reports an unparseable 200 as api_request_failed (parse)", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 200 }));
    await expect(apiJson("/auth/me")).rejects.toMatchObject({ kind: "parse" });
    expect(trackMock).toHaveBeenCalledWith("api_request_failed", expect.objectContaining({ kind: "parse", route_template: "/auth/me" }));
  });

  it("routeTemplate drops query, hash and host and templates numeric ids", () => {
    expect(routeTemplate("/inventory/products/12/stock?x=1#a")).toBe("/inventory/products/{id}/stock");
    expect(routeTemplate("https://api.example.com/suppliers/3")).toBe("/suppliers/{id}");
    expect(routeTemplate("/auth/login")).toBe("/auth/login");
  });
});
