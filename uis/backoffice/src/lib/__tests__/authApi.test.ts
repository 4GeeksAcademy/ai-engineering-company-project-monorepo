/** @jest-environment node */
import { changePassword, INVALID_RESET_LINK, login, register, resetPassword } from "@/lib/authApi";
import { ApiError } from "@/lib/errors";
import { track } from "@/lib/telemetry";

jest.mock("@/lib/auth", () => ({ getToken: jest.fn(() => "tok"), clearToken: jest.fn(), redirectToLogin: jest.fn() }));

jest.mock("@/lib/telemetry", () => ({ track: jest.fn() }));

const fetchMock = jest.fn();
const reply = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status });

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock;
});

describe("login", () => {
  it("posts the form-encoded credentials and returns the access token", async () => {
    fetchMock.mockResolvedValue(reply(200, { access_token: "jwt", token_type: "bearer" }));
    await expect(login("a@b.com", "pw-123456")).resolves.toBe("jwt");
    const [, init] = fetchMock.mock.calls[0];
    expect(String(init.body)).toBe("username=a%40b.com&password=pw-123456");
  });

  it("translates 401 to a generic Spanish message", async () => {
    fetchMock.mockResolvedValue(reply(401, { detail: "Incorrect email or password" }));
    await expect(login("a@b.com", "bad")).rejects.toThrow("Email o contraseña incorrectos.");
  });

  it("reports login_failed with the reason only, never the email or the password", async () => {
    fetchMock.mockResolvedValue(reply(401, { detail: "Incorrect email or password" }));
    await expect(login("ana@acme.com", "s3cret-pw")).rejects.toBeInstanceOf(ApiError);
    expect(track).toHaveBeenCalledWith("login_failed", { reason: "bad_credentials" });
    expect(JSON.stringify((track as jest.Mock).mock.calls)).not.toMatch(/ana@acme|s3cret/);
  });

  it("does not report login_failed for a network failure or a success", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(login("a@b.com", "pw-123456")).rejects.toBeInstanceOf(ApiError);
    fetchMock.mockResolvedValue(reply(200, { access_token: "jwt" }));
    await login("a@b.com", "pw-123456");
    expect(track).not.toHaveBeenCalledWith("login_failed", expect.anything());
  });

  it("rejects a 200 without an access_token", async () => {
    fetchMock.mockResolvedValue(reply(200, {}));
    await expect(login("a@b.com", "pw-123456")).rejects.toMatchObject({ kind: "parse" });
  });
});

describe("register", () => {
  it("reports a 409 on the email field", async () => {
    fetchMock.mockResolvedValue(reply(409, { detail: "That email is already registered" }));
    const error = await register({ email: "a@b.com", password: "pw-123456" }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.fieldErrors.email).toBe("Ya existe una cuenta con este email.");
  });
});

describe("resetPassword / changePassword", () => {
  it("maps a 400 on reset to the invalid-link message", async () => {
    fetchMock.mockResolvedValue(reply(400, { detail: "This reset link is invalid, expired or already used" }));
    await expect(resetPassword("t", "new-pass-123")).rejects.toThrow(INVALID_RESET_LINK);
  });

  it("maps a 400 on change to an error on the current password field", async () => {
    fetchMock.mockResolvedValue(reply(400, { detail: "The current password is incorrect" }));
    const error = await changePassword("wrong", "new-pass-123").catch((e) => e);
    expect(error.fieldErrors.current_password).toBe("La contraseña actual no es correcta.");
  });

  it("resolves when the API accepts the change", async () => {
    fetchMock.mockResolvedValue(reply(200, { detail: "Password updated" }));
    await expect(changePassword("old-pass-123", "new-pass-123")).resolves.toBeUndefined();
  });
});
