/**
 * @jest-environment node
 */
// Turning an API failure into something a person can act on (`lib/errors.ts`).
//
// Layout shared by every frontend test file: one `describe` per function, and inside each HAPPY PATH, EDGE CASES,
// FAILURE MODES. Arrange / Act / Assert.
import { ApiError } from "@/lib/api";
import { describeError, isConflict, isNotFound } from "@/lib/errors";

const FALLBACK = "No se pudo completar la operación";

describe("describeError", () => {
  describe("happy path (each API failure gets its own explanation)", () => {
    it("explains a lost connection (status 0)", () => {
      expect(describeError(new ApiError("No response from the server", 0), FALLBACK)).toMatch(/conectar con el servidor/);
    });

    it("explains a 403", () => {
      expect(describeError(new ApiError("Admins only", 403), FALLBACK)).toBe("No tienes permiso para hacer esto.");
    });

    it("explains a 404", () => {
      expect(describeError(new ApiError("User x not found", 404), FALLBACK)).toMatch(/No se encontró/);
    });

    it("explains a 409", () => {
      expect(describeError(new ApiError("conflict", 409), FALLBACK)).toMatch(/ya no es posible/);
    });

    it.each([400, 401, 422])("passes the API's own message through for a %i", (status) => {
      expect(describeError(new ApiError("email: value is not a valid email address", status), FALLBACK)).toBe(
        "email: value is not a valid email address",
      );
    });
  });

  describe("edge cases", () => {
    it("treats the 499/500 boundary correctly", () => {
      expect(describeError(new ApiError("client side", 499), FALLBACK)).toBe("client side");
      expect(describeError(new ApiError("client side", 500), FALLBACK)).toMatch(/servidor ha tenido un problema/);
    });

    it("falls back when a client error carries no message", () => {
      expect(describeError(new ApiError("", 400), FALLBACK)).toBe(FALLBACK);
    });
  });

  describe("failure modes", () => {
    it.each([
      ["a plain Error", new Error("secret internal detail")],
      ["a TypeError from fetch", new TypeError("fetch failed")],
      ["a string", "boom"],
      ["null", null],
      ["undefined", undefined],
      ["an object that only looks like an ApiError", { status: 500, message: "x" }],
    ])("gives the fallback for %s, never its own text", (_name, error) => {
      expect(describeError(error, FALLBACK)).toBe(FALLBACK);
    });

    it.each([500, 502, 503, 599])("tells the user the server had a problem for %i, without leaking its message", (status) => {
      const message = describeError(new ApiError("Traceback: db password is hunter2", status), FALLBACK);

      expect(message).toMatch(/servidor ha tenido un problema/);
      expect(message).not.toContain("hunter2");
    });
  });
});

describe("isConflict / isNotFound", () => {
  describe("happy path", () => {
    it("recognise an ApiError with exactly that status", () => {
      expect(isConflict(new ApiError("x", 409))).toBe(true);
      expect(isNotFound(new ApiError("x", 404))).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("do not mix the two statuses up", () => {
      expect(isConflict(new ApiError("x", 404))).toBe(false);
      expect(isNotFound(new ApiError("x", 409))).toBe(false);
    });
  });

  describe("failure modes", () => {
    it("are false for anything that is not an ApiError", () => {
      for (const value of [new Error("409"), { status: 409 }, 409, "409", null, undefined]) {
        expect(isConflict(value)).toBe(false);
        expect(isNotFound(value)).toBe(false);
      }
    });
  });
});
