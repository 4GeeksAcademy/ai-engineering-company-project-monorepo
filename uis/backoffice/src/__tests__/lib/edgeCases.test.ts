/**
 * @jest-environment node
 */
// Edge cases proposed by the AI assistant after probing the frontend against the backend (TESTING.md, section 8).
// Run only these with `npx jest -t "AI-suggested"`.
//
// Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. In this file the failure modes are
// weaknesses the probes exposed: each is `it.failing`, so it passes while the weakness exists and FAILS the day it is
// fixed, which is the moment to drop the `.failing`. None of them changes production code; the numbers refer to the
// table in TESTING.md, section 8.
import { validateProfileFields } from "@/lib/profileFields";
import { validateSignUp, type Form } from "@/lib/signUpForm";

const valid: Form = {
  email: "ana@example.com",
  password: "s3cret-pass",
  confirmPassword: "s3cret-pass",
  name: "Ana",
  phone: "",
  address: "",
};
const withEmail = (email: string): Form => ({ ...valid, email });
const withPassword = (password: string): Form => ({ ...valid, password, confirmPassword: password });

describe("AI-suggested edge cases", () => {
  describe("happy path (the form agrees with the API)", () => {
    it.each(["x@y.z", "a@b.c", "ana@exámple.com", "ana+tag@example.com", `${"a".repeat(65)}@example.com`])(
      "accepts the email %j, which the API accepts too",
      (email) => {
        expect(validateSignUp(withEmail(email)).email).toBeUndefined();
      },
    );

    it.each(["ana", "ana@", "@example.com", "ana@example", "ana@@example.com", "a na@example.com", "ana@localhost"])(
      "refuses the email %j, which the API refuses too",
      (email) => {
        expect(validateSignUp(withEmail(email)).email).toBeDefined();
      },
    );
  });

  describe("edge cases", () => {
    it("counts a password of 8 ASCII characters as long enough, and 7 as too short", () => {
      expect(validateSignUp(withPassword("12345678")).password).toBeUndefined();
      expect(validateSignUp(withPassword("1234567")).password).toBeDefined();
    });
  });

  describe("failure modes (decision pending: the form is more permissive or stricter than the API)", () => {
    // #5: the form accepts these emails and the API answers 422, so the user sees the server's message instead of the form's.
    it.failing.each([
      "ana..b@example.com",
      ".ana@example.com",
      "ana.@example.com",
      "ana@example.com.",
      "ana@-example.com",
      "ana@example-.com",
      "ana@123.45",
      "ana@[127.0.0.1]",
      `ana@${"b".repeat(64)}.com`,
    ])("refuses %j, as the API does", (email) => {
      expect(validateSignUp(withEmail(email)).email).toBeDefined();
    });

    // #5: JavaScript counts UTF-16 units, the API counts characters. 4 emoji are 8 units (the form lets them through)
    // and 4 characters (the API refuses them for being under 8).
    it.failing("refuses a password of 4 emoji, as the API does (it counts characters, not UTF-16 units)", () => {
      expect(validateSignUp(withPassword("\u{1F600}".repeat(4))).password).toBeDefined();
    });

    // #5: the opposite mismatch. 41 emoji are 82 UTF-16 units (the form refuses them for passing 80) and 41 characters
    // (the API accepts them).
    it.failing("accepts a name of 41 emoji, as the API does (it counts characters, not UTF-16 units)", () => {
      const errors = validateProfileFields({ name: "\u{1F600}".repeat(41), phone: "", address: "" }, { nameRequired: false });

      expect(errors.name).toBeUndefined();
    });

    // #7: a NEXT_PUBLIC_API_BASE_URL with a trailing slash produces "//auth/me", which the API answers with a 404.
    it.failing("builds a clean URL when the API base URL ends with a slash", async () => {
      const calls: string[] = [];
      globalThis.fetch = (async (url: string) => {
        calls.push(url);
        return new Response("{}", { status: 200 });
      }) as unknown as typeof fetch;
      const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
      process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000/";
      let fetchMe!: () => Promise<unknown>;
      jest.isolateModules(() => {
        fetchMe = require("@/lib/api").fetchMe; // re-evaluated so it reads the variable set above
      });
      try {
        await fetchMe();
      } finally {
        if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
        else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
      }

      expect(calls).toEqual(["http://localhost:8000/auth/me"]);
    });
  });
});
