/**
 * Template for the pure TypeScript helpers: one `describe` per exported function, and inside it the same three
 * blocks in the same order: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert, no mocks needed
 * because these functions are pure. Run with `npx jest --coverage`.
 *
 * Subject: the profile-field validator shared by the sign-up form and the profile page. Its limits mirror the
 * API (services/api/profiles/fields.py), so a value rejected here is a value the API would reject too.
 */
import { ADDRESS_MAX, NAME_MAX, PHONE_PATTERN, validateProfileFields, type ProfileFieldValues } from "@/lib/profileFields";

const valid: ProfileFieldValues = { name: "Ana García", phone: "+34 600 000 000", address: "Calle Mayor 1, Madrid" };
const withValues = (overrides: Partial<ProfileFieldValues>): ProfileFieldValues => ({ ...valid, ...overrides });

describe("limits", () => {
  it("are the ones the API enforces", () => {
    expect([NAME_MAX, ADDRESS_MAX]).toEqual([80, 200]);
  });
});

describe("PHONE_PATTERN", () => {
  describe("happy path", () => {
    it.each(["+34 600 000 000", "600000000", "(91) 555-12.34", "+1 (555) 123-4567", "123456"])("accepts %j", (phone) => {
      expect(PHONE_PATTERN.test(phone)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("accepts exactly 6 and exactly 20 characters", () => {
      expect(PHONE_PATTERN.test("1".repeat(6))).toBe(true);
      expect(PHONE_PATTERN.test("1".repeat(20))).toBe(true);
    });
  });

  describe("failure modes", () => {
    it.each(["12345", "1".repeat(21), "abcdefgh", "600 000 00x", "++34600000000", "600/000/000", "", "   "])("rejects %j", (phone) => {
      expect(PHONE_PATTERN.test(phone)).toBe(false);
    });
  });
});

describe("validateProfileFields", () => {
  // --- HAPPY PATH --------------------------------------------------------------------------------------
  describe("happy path", () => {
    it("reports nothing for a complete, valid profile", () => {
      expect(validateProfileFields(valid, { nameRequired: true })).toEqual({});
    });

    it("lets the optional fields stay empty", () => {
      expect(validateProfileFields({ name: "Ana", phone: "", address: "" }, { nameRequired: true })).toEqual({});
    });

    it("lets the name stay empty at sign-up, where it is optional", () => {
      expect(validateProfileFields(withValues({ name: "" }), { nameRequired: false })).toEqual({});
    });
  });

  // --- EDGE CASES --------------------------------------------------------------------------------------
  describe("edge cases", () => {
    it("accepts a name of exactly the maximum length, and an address of exactly the maximum", () => {
      const values = withValues({ name: "n".repeat(NAME_MAX), address: "a".repeat(ADDRESS_MAX) });
      expect(validateProfileFields(values, { nameRequired: true })).toEqual({});
    });

    it("measures the trimmed value, not the spaces around it", () => {
      const values = withValues({ name: ` ${"n".repeat(NAME_MAX)} `, address: `  ${"a".repeat(ADDRESS_MAX)}  `, phone: "  600000000  " });
      expect(validateProfileFields(values, { nameRequired: true })).toEqual({});
    });

    it("applies the phone length limit to the trimmed value", () => {
      const padded = `  ${"1".repeat(20)}  `; // 24 characters typed, 20 that count
      expect(validateProfileFields(withValues({ phone: padded }), { nameRequired: true })).toEqual({});
    });

    it("treats a blank phone or address as empty, not as invalid", () => {
      expect(validateProfileFields(withValues({ phone: "   ", address: "\t \n" }), { nameRequired: true })).toEqual({});
    });

    it("counts characters, not bytes (accents and emoji are fine within the limit)", () => {
      expect(validateProfileFields(withValues({ name: "ñ".repeat(NAME_MAX) }), { nameRequired: true })).toEqual({});
    });
  });

  // --- FAILURE MODES -----------------------------------------------------------------------------------
  describe("failure modes", () => {
    it.each(["", "   ", "\t\n"])("requires the name when asked to, and %j is not a name", (name) => {
      const errors = validateProfileFields(withValues({ name }), { nameRequired: true });
      expect(errors.name).toBe("El nombre es obligatorio.");
      expect(Object.keys(errors)).toEqual(["name"]);
    });

    it("refuses a name one character over the limit, with the limit in the message", () => {
      const errors = validateProfileFields(withValues({ name: "n".repeat(NAME_MAX + 1) }), { nameRequired: false });
      expect(errors.name).toContain(`${NAME_MAX} caracteres`);
    });

    it("refuses an address one character over the limit, with the limit in the message", () => {
      const errors = validateProfileFields(withValues({ address: "a".repeat(ADDRESS_MAX + 1) }), { nameRequired: true });
      expect(errors.address).toContain(`${ADDRESS_MAX} caracteres`);
    });

    it.each(["abc", "12345", "1".repeat(21), "600 000 00x", "+", "<script>"])("refuses the phone %j", (phone) => {
      const errors = validateProfileFields(withValues({ phone }), { nameRequired: true });
      expect(errors.phone).toMatch(/teléfono no es válido/);
      expect(Object.keys(errors)).toEqual(["phone"]);
    });

    it("reports every invalid field at once, each under its own key", () => {
      const errors = validateProfileFields(
        { name: "", phone: "abc", address: "a".repeat(ADDRESS_MAX + 1) },
        { nameRequired: true },
      );
      expect(Object.keys(errors).sort()).toEqual(["address", "name", "phone"]);
    });

    it("does not modify the values it is given", () => {
      const values = withValues({ name: "  Ana  " });
      validateProfileFields(values, { nameRequired: true });
      expect(values.name).toBe("  Ana  ");
    });
  });
});
