/**
 * @jest-environment node
 */
// Node environment: the validator uses TextEncoder (to count password bytes), which jsdom does not provide.
//
// Same template as profileFields.test.ts: one `describe` per exported function, with HAPPY PATH, EDGE CASES and
// FAILURE MODES blocks. Subject: the sign-up form's rules (mirroring the API's UserCreate) and the translation of
// an API rejection into messages the form can show.
import { ApiError } from "@/lib/api";
import {
  EMAIL_PATTERN,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN,
  emptyForm,
  signUpErrorFromApi,
  validateSignUp,
  type Form,
} from "@/lib/signUpForm";

const valid: Form = {
  email: "ana@example.com",
  password: "s3cret-pass",
  confirmPassword: "s3cret-pass",
  name: "Ana",
  phone: "+34 600 000 000",
  address: "Calle Mayor 1",
};
const form = (overrides: Partial<Form>): Form => ({ ...valid, ...overrides });
const withPassword = (password: string): Form => form({ password, confirmPassword: password });

describe("limits", () => {
  it("are the ones the API enforces (UserCreate)", () => {
    expect([PASSWORD_MIN, PASSWORD_MAX_BYTES]).toEqual([8, 72]);
  });
});

describe("EMAIL_PATTERN", () => {
  describe("happy path", () => {
    it.each(["ana@example.com", "a.b+tag@sub.example.co"])("accepts %j", (email) => {
      expect(EMAIL_PATTERN.test(email)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("accepts the shortest plausible address", () => {
      expect(EMAIL_PATTERN.test("x@y.z")).toBe(true);
    });
  });

  describe("failure modes", () => {
    it.each(["", "ana", "ana@", "@example.com", "ana@example", "ana@@example.com", "a na@example.com", "ana@exa mple.com", "ana@.com"])(
      "rejects %j",
      (email) => {
        expect(EMAIL_PATTERN.test(email)).toBe(false);
      },
    );
  });
});

describe("validateSignUp", () => {
  // --- HAPPY PATH --------------------------------------------------------------------------------------
  describe("happy path", () => {
    it("reports nothing for a valid form", () => {
      expect(validateSignUp(valid)).toEqual({});
    });

    it("accepts a sign-up with only the required fields (the profile ones are optional)", () => {
      expect(validateSignUp(form({ name: "", phone: "", address: "" }))).toEqual({});
    });
  });

  // --- EDGE CASES --------------------------------------------------------------------------------------
  describe("edge cases", () => {
    it("trims the email before judging it", () => {
      expect(validateSignUp(form({ email: "  ana@example.com  " }))).toEqual({});
    });

    it.each([
      ["8 characters", "12345678"],
      ["exactly 72 bytes", "x".repeat(72)],
      ["72 bytes of 2-byte characters", "é".repeat(36)],
    ])("accepts a password of %s", (_label, password) => {
      expect(validateSignUp(withPassword(password))).toEqual({});
    });

    it("counts the limit in bytes, not characters", () => {
      const errors = validateSignUp(withPassword("é".repeat(37))); // 37 characters, 74 bytes
      expect(errors.password).toContain(`${PASSWORD_MAX_BYTES} bytes`);
    });

    it("does not trim the password: spaces are part of it", () => {
      expect(validateSignUp(withPassword(" 1234567 "))).toEqual({}); // 9 characters with the spaces, 7 without
      expect(validateSignUp(withPassword("  1234  "))).toEqual({}); // 8 characters with the spaces, 4 without
    });

    it("counts a password made of spaces as a short password, not as a missing one", () => {
      expect(validateSignUp(withPassword("   ")).password).toBe(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
    });

    it("compares the confirmation exactly (case and spaces count)", () => {
      expect(validateSignUp(form({ confirmPassword: "S3cret-pass" })).confirmPassword).toBeDefined();
      expect(validateSignUp(form({ confirmPassword: "s3cret-pass " })).confirmPassword).toBeDefined();
    });

    it("does not also complain about the confirmation when the password is simply missing", () => {
      const errors = validateSignUp(form({ password: "", confirmPassword: "" }));
      expect(Object.keys(errors)).toEqual(["password"]);
    });
  });

  // --- FAILURE MODES -----------------------------------------------------------------------------------
  describe("failure modes", () => {
    it.each(["", "   "])("requires an email, and %j is not one", (email) => {
      expect(validateSignUp(form({ email })).email).toBe("El email es obligatorio.");
    });

    it.each(["ana", "ana@", "@example.com", "ana@example", "ana@@example.com", "a na@example.com"])("refuses the email %j", (email) => {
      expect(validateSignUp(form({ email })).email).toBe("El email no es válido.");
    });

    it("requires a password", () => {
      expect(validateSignUp(withPassword("")).password).toBe("La contraseña es obligatoria.");
    });

    it("refuses a password under the minimum, naming the minimum", () => {
      const errors = validateSignUp(withPassword("1234567"));
      expect(errors.password).toBe(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
    });

    it("refuses a password over the byte limit, naming the limit", () => {
      const errors = validateSignUp(withPassword("x".repeat(PASSWORD_MAX_BYTES + 1)));
      expect(errors.password).toBe(`La contraseña es demasiado larga (máximo ${PASSWORD_MAX_BYTES} bytes).`);
    });

    it("refuses a confirmation that does not match", () => {
      expect(validateSignUp(form({ confirmPassword: "different" })).confirmPassword).toBe("Las contraseñas no coinciden.");
    });

    it("includes the profile rules: an invalid phone is refused, a name is not required", () => {
      expect(validateSignUp(form({ phone: "abc" })).phone).toMatch(/teléfono no es válido/);
      expect(validateSignUp(form({ name: "" })).name).toBeUndefined();
    });

    it("reports every problem at once", () => {
      const errors = validateSignUp({ ...emptyForm, phone: "abc", confirmPassword: "x" });
      expect(Object.keys(errors).sort()).toEqual(["confirmPassword", "email", "password", "phone"]);
    });

    it("does not modify the form it is given", () => {
      const input = form({ email: "  ana@example.com " });
      validateSignUp(input);
      expect(input.email).toBe("  ana@example.com ");
    });
  });
});

describe("signUpErrorFromApi", () => {
  // --- HAPPY PATH: the rejections the API really sends ---------------------------------------------------
  describe("happy path (the API's documented rejections)", () => {
    it("a 409 means the email is taken: the message goes under the email field", () => {
      const result = signUpErrorFromApi(new ApiError("A user with email 'x' already exists", 409));
      expect(result).toEqual({ fields: { email: "Ya existe una cuenta con ese email." }, general: null });
    });

    it("a 422 on known fields is shown under those fields, with no general message", () => {
      const result = signUpErrorFromApi(new ApiError("...", 422, { email: "not valid", password: "too short" }));
      expect(result).toEqual({ fields: { email: "not valid", password: "too short" }, general: null });
    });
  });

  // --- EDGE CASES --------------------------------------------------------------------------------------
  describe("edge cases", () => {
    it("every form field can receive its own server message", () => {
      const server = Object.fromEntries(Object.keys(emptyForm).map((field) => [field, `server says ${field}`]));
      expect(signUpErrorFromApi(new ApiError("...", 422, server)).fields).toEqual(server);
    });

    it("a 422 that mixes known and unknown fields keeps the known ones and reports the rest in the general message", () => {
      const result = signUpErrorFromApi(new ApiError("...", 422, { email: "not valid", role: "extra fields not permitted" }));
      expect(result.fields).toEqual({ email: "not valid" });
      expect(result.general).toContain("Revisa los datos del formulario.");
      expect(result.general).toContain("extra fields not permitted");
    });

    it("a 422 with no recognisable field still tells the user to review the form", () => {
      expect(signUpErrorFromApi(new ApiError("...", 422))).toEqual({ fields: {}, general: "Revisa los datos del formulario." });
      expect(signUpErrorFromApi(new ApiError("...", 422, { role: "nope" })).fields).toEqual({});
    });
  });

  // --- FAILURE MODES -----------------------------------------------------------------------------------
  describe("failure modes", () => {
    it.each([
      ["a network failure (TypeError)", new TypeError("fetch failed")],
      ["a plain Error", new Error("boom")],
      ["a string", "boom"],
      ["null", null],
      ["undefined", undefined],
    ])("%s is a generic connection message, never its own text", (_label, error) => {
      const result = signUpErrorFromApi(error);
      expect(result.fields).toEqual({});
      expect(result.general).toMatch(/Comprueba tu conexión/);
      expect(JSON.stringify(result)).not.toContain("boom");
    });

    it.each([400, 401, 403, 404, 429, 500, 502, 503])("a %i is a generic retry message and does not leak the server's text", (status) => {
      const result = signUpErrorFromApi(new ApiError("Traceback: db password is hunter2", status));
      expect(result).toEqual({ fields: {}, general: "No se pudo crear la cuenta. Inténtalo de nuevo." });
    });

    it("an ApiError with status 0 (server unreachable) is the generic retry message", () => {
      expect(signUpErrorFromApi(new ApiError("No response from the server", 0)).general).toBe(
        "No se pudo crear la cuenta. Inténtalo de nuevo.",
      );
    });
  });
});
