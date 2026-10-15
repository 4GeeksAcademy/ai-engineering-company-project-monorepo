/**
 * Template for the pure TypeScript helpers: one `describe` per exported function, and inside it the same three
 * blocks in the same order: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert, no mocks needed
 * because these functions are pure. Run with `npx jest --coverage`.
 *
 * Subject: the profile-field validator shared by the sign-up form and the profile page. Its limits mirror the
 * API (services/api/profiles/fields.py), so a value rejected here is a value the API would reject too.
 */
import {
  ADDRESS_MAX,
  NAME_MAX,
  PHONE_PATTERN,
  profileChanges,
  toProfileForm,
  validateProfileFields,
  type ProfileFieldValues,
} from "@/lib/profileFields";
import type { Me } from "@/types/auth";

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

const me = (profile: Partial<Me["profile"]>): Me => ({
  id: "u1",
  email: "ana@example.com",
  role: "user",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  profile: { id: "p1", user_id: "u1", name: "Ana", contact_email: null, phone: null, address: null, ...profile },
});

describe("toProfileForm", () => {
  describe("happy path", () => {
    it("fills the profile form from the session's user", () => {
      expect(toProfileForm(me({ name: "Ana García", phone: "+34 600 000 000", address: "Calle Mayor 1" }))).toEqual({
        name: "Ana García",
        phone: "+34 600 000 000",
        address: "Calle Mayor 1",
      });
    });
  });

  describe("edge cases", () => {
    it("an optional field the user has not set is an empty input, not the word null", () => {
      expect(toProfileForm(me({ phone: null, address: null }))).toEqual({ name: "Ana", phone: "", address: "" });
    });

    it("takes nothing from the account itself: no email, no id", () => {
      expect(Object.keys(toProfileForm(me({})))).toEqual(["name", "phone", "address"]);
    });
  });

  describe("failure modes", () => {
    it("a user without a profile is a programming error that fails loudly instead of showing an empty form", () => {
      expect(() => toProfileForm({ ...me({}), profile: undefined } as unknown as Me)).toThrow(TypeError);
    });
  });
});

describe("profileChanges", () => {
  const saved: ProfileFieldValues = { name: "Ana", phone: "600000000", address: "Calle 1" };

  describe("happy path", () => {
    it("sends only the fields that changed", () => {
      expect(profileChanges(saved, { ...saved, name: "Ana María" })).toEqual({ name: "Ana María" });
      expect(profileChanges(saved, { name: "Ana", phone: "611111111", address: "Calle 2" })).toEqual({
        phone: "611111111",
        address: "Calle 2",
      });
    });
  });

  describe("edge cases", () => {
    it("nothing changed means nothing to send", () => {
      expect(profileChanges(saved, saved)).toEqual({});
    });

    it("spaces around a value are not a change, and a changed value is sent trimmed", () => {
      expect(profileChanges(saved, { name: "  Ana  ", phone: " 600000000 ", address: "Calle 1  " })).toEqual({});
      expect(profileChanges(saved, { ...saved, address: "  Calle 2  " })).toEqual({ address: "Calle 2" });
    });

    it("an emptied optional field is sent as null, which the API reads as 'clear it'", () => {
      expect(profileChanges(saved, { ...saved, phone: "", address: "   " })).toEqual({ phone: null, address: null });
    });

    it("an optional field that was empty and still is does not count as a change", () => {
      const bare: ProfileFieldValues = { name: "Ana", phone: "", address: "" };

      expect(profileChanges(bare, { name: "Ana", phone: "  ", address: "" })).toEqual({});
    });
  });

  describe("failure modes", () => {
    it("an emptied name is sent as an empty string: the form's validation has to stop it before this point", () => {
      expect(profileChanges(saved, { ...saved, name: "   " })).toEqual({ name: "" });
    });

    it("does not change the values it is given", () => {
      const form = { name: "  Ana María ", phone: "", address: "Calle 1" };

      profileChanges(saved, form);

      expect(form).toEqual({ name: "  Ana María ", phone: "", address: "Calle 1" });
    });
  });
});
