/**
 * @jest-environment node
 */
// The authentication half of the API client (`lib/api.ts`): login, sign-up, authenticated calls and how failures are
// reported. What it asserts is behaviour (a token is kept, a 401 ends the session, an error becomes a message), not how
// bytes are encoded on the wire: that is covered end to end by the Playwright scripts.
//
// Node environment on purpose: it has the real fetch / Response / Headers, which jsdom lacks. localStorage does not
// exist here, so a small in-memory one stands in for the browser's.
//
// Layout shared by every frontend test file: one `describe` per function (or area), and inside each HAPPY PATH, EDGE
// CASES, FAILURE MODES. Arrange / Act / Assert.
import { ApiError, fetchMe, login, register, updateMyProfile } from "@/lib/api";
import { clearToken, getToken, onTokenChange, setToken } from "@/lib/token";

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
  clear() {
    this.items.clear();
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

const ME = { id: "u1", email: "ana@example.com", role: "user", is_active: true, created_at: "2026-01-01T00:00:00Z", profile: {} };
const PROFILE = { id: "p1", user_id: "u1", name: "Ana", contact_email: null, phone: null, address: null };
const SIGNED_UP = { id: "u2", email: "new@example.com", role: "user", is_active: true, created_at: "x", message: "Account created." };

describe("ApiError", () => {
  describe("happy path", () => {
    it("is an Error that carries the status and the per-field messages", () => {
      const error = new ApiError("bad", 422, { email: "invalid" });

      expect(error).toBeInstanceOf(Error);
      expect([error.message, error.status, error.fieldErrors]).toEqual(["bad", 422, { email: "invalid" }]);
    });
  });

  describe("edge cases", () => {
    it("has no field errors unless given some", () => {
      expect(new ApiError("x", 500).fieldErrors).toEqual({});
    });
  });
});

describe("login", () => {
  describe("happy path", () => {
    it("sends the email and the password as the credentials, and stores the token it receives", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: "the.jwt.token", token_type: "bearer", expires_in: 1800 }));

      await login("ana@example.com", "s3cret-pass");

      const form = new URLSearchParams(lastCall().init.body as URLSearchParams);
      expect([form.get("username"), form.get("password")]).toEqual(["ana@example.com", "s3cret-pass"]); // OAuth2: username = email
      expect(getToken()).toBe("the.jwt.token");
    });

    it("notifies the listeners that a session started", async () => {
      const listener = jest.fn();
      const off = onTokenChange(listener);
      fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: "tok" }));

      await login("ana@example.com", "pw");

      expect(listener).toHaveBeenCalledTimes(1);
      off();
    });
  });

  describe("edge cases", () => {
    it("never sends a stale session token along with the credentials", async () => {
      setToken("stale");
      fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: "fresh" }));

      await login("ana@example.com", "pw");

      expect(lastCall().headers.get("Authorization")).toBeNull();
      expect(getToken()).toBe("fresh");
    });

    it("a failed login does not end an existing session (a 401 here is not an expired token)", async () => {
      setToken("still-good");
      const listener = jest.fn();
      const off = onTokenChange(listener);
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Incorrect email or password" }, 401));

      await rejection(login("ana@example.com", "wrong"));

      expect(getToken()).toBe("still-good");
      expect(listener).not.toHaveBeenCalled();
      off();
    });
  });

  describe("failure modes", () => {
    it("wrong credentials reject with the API's message and status, and store nothing", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Incorrect email or password" }, 401));

      const error = await rejection(login("ana@example.com", "wrong"));

      expect(error).toBeInstanceOf(ApiError);
      expect([error.status, error.message]).toEqual([401, "Incorrect email or password"]);
      expect(getToken()).toBeNull();
    });

    it("reports the field errors of a 422", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: [{ type: "missing", loc: ["body", "username"], msg: "Field required" }] }, 422));

      const error = await rejection(login("", "pw"));

      expect(error.status).toBe(422);
      expect(error.fieldErrors).toEqual({ username: "Field required" });
    });

    it("rejects, and stores nothing, when the server cannot be reached", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

      await expect(login("ana@example.com", "pw")).rejects.toThrow();

      expect(getToken()).toBeNull();
    });

    it("rejects with the status text for a non-JSON error page (gateway down)", async () => {
      fetchMock.mockResolvedValueOnce(new Response("<html>Bad Gateway</html>", { status: 502, statusText: "Bad Gateway" }));

      const error = await rejection(login("ana@example.com", "pw"));

      expect([error.status, error.message]).toEqual([502, "Bad Gateway"]);
      expect(getToken()).toBeNull();
    });

    it.each([
      ["no access_token", { token_type: "bearer" }],
      ["an empty access_token", { access_token: "" }],
      ["a null access_token", { access_token: null }],
      ["a numeric access_token", { access_token: 123 }],
    ])("a 200 with %s is an error and stores no token (never the text 'undefined')", async (_name, body) => {
      fetchMock.mockResolvedValueOnce(jsonResponse(body));

      const error = await rejection(login("ana@example.com", "pw"));

      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(502);
      expect(getToken()).toBeNull();
    });

    it("an invalid 200 does not overwrite an existing session", async () => {
      setToken("still-good");
      fetchMock.mockResolvedValueOnce(jsonResponse({}));

      await rejection(login("ana@example.com", "pw"));

      expect(getToken()).toBe("still-good");
    });
  });
});

describe("register", () => {
  describe("happy path", () => {
    it("creates the account and returns it, without logging the new user in (that is the context's job)", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(SIGNED_UP, 201));

      const result = await register({ email: "new@example.com", password: "s3cret-pass" });

      expect(result).toEqual(SIGNED_UP);
      expect(getToken()).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("leaves out optional profile fields that are empty or undefined, and keeps the rest", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(SIGNED_UP, 201));

      await register({ email: "new@example.com", password: "s3cret-pass", name: "", phone: undefined, address: "Calle 1" });

      expect(JSON.parse(lastCall().init.body as string)).toEqual({ email: "new@example.com", password: "s3cret-pass", address: "Calle 1" });
    });

    it("does not send someone else's session token with a public sign-up", async () => {
      setToken("someone-elses");
      fetchMock.mockResolvedValueOnce(jsonResponse(SIGNED_UP, 201));

      await register({ email: "new@example.com", password: "s3cret-pass" });

      expect(lastCall().headers.get("Authorization")).toBeNull();
    });
  });

  describe("failure modes", () => {
    it("rejects with the API's message for a duplicate email (409)", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "A user with email 'new@example.com' already exists" }, 409));

      const error = await rejection(register({ email: "new@example.com", password: "s3cret-pass" }));

      expect([error.status, error.message]).toEqual([409, "A user with email 'new@example.com' already exists"]);
    });

    it("maps 422 validation errors to fields, without the 'Value error, ' prefix", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          {
            detail: [
              { loc: ["body", "email"], msg: "value is not a valid email address" },
              { loc: ["body", "password"], msg: "Value error, password must be at most 72 bytes long" },
            ],
          },
          422,
        ),
      );

      const error = await rejection(register({ email: "x", password: "y" }));

      expect(error.fieldErrors).toEqual({
        email: "value is not a valid email address",
        password: "password must be at most 72 bytes long",
      });
      expect(error.message).toBe("email: value is not a valid email address; password: password must be at most 72 bytes long");
    });
  });
});

describe("authenticated calls (fetchMe, updateMyProfile)", () => {
  describe("happy path", () => {
    it("carries the session token and returns the parsed body", async () => {
      setToken("my.jwt");
      fetchMock.mockResolvedValueOnce(jsonResponse(ME));

      await expect(fetchMe()).resolves.toEqual(ME);

      expect(lastCall().headers.get("Authorization")).toBe("Bearer my.jwt");
    });

    it("updateMyProfile saves the changes for the session's own profile, never naming an owner", async () => {
      setToken("my.jwt");
      fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE));

      await expect(updateMyProfile({ name: "Ana", phone: null })).resolves.toEqual(PROFILE);

      const { init, headers } = lastCall();
      expect(headers.get("Authorization")).toBe("Bearer my.jwt");
      expect(JSON.parse(init.body as string)).toEqual({ name: "Ana", phone: null });
    });
  });

  describe("edge cases", () => {
    it("sends no credentials when there is no token", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(ME));

      await fetchMe();

      expect(lastCall().headers.has("Authorization")).toBe(false);
    });

    it("a 401 with no token does nothing (nobody was logged in)", async () => {
      const listener = jest.fn();
      const off = onTokenChange(listener);
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Not authenticated" }, 401));

      await rejection(fetchMe());

      expect(listener).not.toHaveBeenCalled();
      off();
    });

    it("a late 401 for an old token does not end a newer session", async () => {
      setToken("old");
      fetchMock.mockImplementationOnce(async () => {
        setToken("new"); // the user logged in again while this request was in flight
        return jsonResponse({ detail: "Could not validate credentials" }, 401);
      });

      await rejection(fetchMe());

      expect(getToken()).toBe("new");
    });

    it("once the token is gone, the next call goes out without credentials", async () => {
      setToken("expired");
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "x" }, 401));
      await rejection(fetchMe());
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Not authenticated" }, 401));

      await rejection(fetchMe());

      expect(lastCall().headers.has("Authorization")).toBe(false);
    });
  });

  describe("failure modes", () => {
    it("a 401 means the session is over: the token is forgotten, the listeners told, the error still raised", async () => {
      setToken("expired.jwt");
      const listener = jest.fn();
      const off = onTokenChange(listener);
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Could not validate credentials" }, 401));

      const error = await rejection(fetchMe());

      expect([error.status, error.message]).toEqual([401, "Could not validate credentials"]);
      expect(getToken()).toBeNull();
      expect(listener).toHaveBeenCalledTimes(1);
      off();
    });

    it("a 401 on updateMyProfile ends the session too", async () => {
      setToken("expired");
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Could not validate credentials" }, 401));

      await rejection(updateMyProfile({ name: "Ana" }));

      expect(getToken()).toBeNull();
    });

    it.each([403, 404, 409, 422, 500, 503])("a %i keeps the session", async (status) => {
      setToken("valid");
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "nope" }, status));

      const error = await rejection(fetchMe());

      expect(error.status).toBe(status);
      expect(getToken()).toBe("valid");
    });

    it("an unreachable server is an ApiError with status 0, and keeps the session", async () => {
      setToken("valid");
      fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

      const error = await rejection(fetchMe());

      expect(error).toBeInstanceOf(ApiError);
      expect([error.status, error.message]).toEqual([0, "No response from the server"]);
      expect(getToken()).toBe("valid");
    });

    it("updateMyProfile reports the field errors of a 422 and keeps the session", async () => {
      setToken("my.jwt");
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: [{ loc: ["body", "phone"], msg: "String should match pattern" }] }, 422));

      const error = await rejection(updateMyProfile({ phone: "abc" }));

      expect([error.status, error.fieldErrors]).toEqual([422, { phone: "String should match pattern" }]);
      expect(getToken()).toBe("my.jwt");
    });
  });
});

describe("how an API error becomes an ApiError (seen through fetchMe)", () => {
  const failWith = (response: Response) => {
    fetchMock.mockResolvedValueOnce(response);
    return rejection(fetchMe());
  };

  describe("happy path", () => {
    it("uses `detail` when it is a string", async () => {
      const error = await failWith(jsonResponse({ detail: "Only an admin can change a role" }, 403));

      expect([error.status, error.message, error.fieldErrors]).toEqual([403, "Only an admin can change a role", {}]);
    });

    it("joins several validation errors, and keeps the first message per field", async () => {
      const error = await failWith(
        jsonResponse(
          {
            detail: [
              { loc: ["body", "email"], msg: "first" },
              { loc: ["body", "email"], msg: "second" },
              { loc: ["body", "name"], msg: "too long" },
            ],
          },
          422,
        ),
      );

      expect(error.message).toBe("email: first; email: second; name: too long");
      expect(error.fieldErrors).toEqual({ email: "first", name: "too long" });
    });
  });

  describe("edge cases", () => {
    it("names nested fields with dots", async () => {
      const error = await failWith(jsonResponse({ detail: [{ loc: ["body", "profile", "name"], msg: "required" }] }, 422));

      expect(error.fieldErrors).toEqual({ "profile.name": "required" });
    });

    it("keeps the message but no field when the location is just the body", async () => {
      const error = await failWith(jsonResponse({ detail: [{ loc: ["body"], msg: "Input should be a valid dictionary" }] }, 422));

      expect(error.message).toBe("Input should be a valid dictionary");
      expect(error.fieldErrors).toEqual({});
    });

    it("copes with validation entries that have no loc or no msg", async () => {
      const error = await failWith(jsonResponse({ detail: [{ msg: "something" }, { loc: ["body", "x"] }] }, 422));

      expect(error.message).toBe("something; x: ");
      expect(error.fieldErrors).toEqual({ x: "" });
    });
  });

  describe("failure modes (bodies that are not what the API promises)", () => {
    it.each([
      ["an HTML page", () => new Response("<html></html>", { status: 502, statusText: "Bad Gateway" }), "Bad Gateway"],
      ["an empty body", () => new Response("", { status: 500, statusText: "Internal Server Error" }), "Internal Server Error"],
      ["JSON without detail", () => jsonResponse({ error: "boom" }, 500, "Server Error"), "Server Error"],
      ["a null detail", () => jsonResponse({ detail: null }, 500, "Server Error"), "Server Error"],
      ["a JSON null body", () => jsonResponse(null, 500, "Server Error"), "Server Error"],
      ["a numeric detail", () => jsonResponse({ detail: 42 }, 500, "Server Error"), "Server Error"],
    ])("falls back to the status text for %s", async (_name, makeResponse, statusText) => {
      const error = await failWith(makeResponse());

      expect(error.message).toBe(statusText);
      expect(error.fieldErrors).toEqual({});
    });
  });
});
