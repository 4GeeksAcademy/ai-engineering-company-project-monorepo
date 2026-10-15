/**
 * Where to go after logging in (`lib/returnTo.ts`). The guard sends to /login?next=<page>; login reads it back. Only
 * paths inside this app may be accepted, or the login page would be an open redirect.
 *
 * Layout shared by every frontend test file: one `describe` per function, and inside each HAPPY PATH, EDGE CASES,
 * FAILURE MODES. Arrange / Act / Assert.
 */
import { currentReturnTo, loginUrl, safeReturnTo } from "@/lib/returnTo";

const APP = "https://app.example";
const hostOf = (path: string) => new URL(path, APP).host;

describe("loginUrl", () => {
  describe("happy path", () => {
    it("remembers the page, URL-encoded", () => {
      expect(loginUrl("/incidents")).toBe("/login?next=%2Fincidents");
    });
  });

  describe("edge cases", () => {
    it("does not bother remembering the home page", () => {
      expect(loginUrl("/")).toBe("/login");
    });

    it("encodes query strings and hashes so they survive as one value", () => {
      const url = loginUrl("/incidents?status=open&page=2#top");

      expect(url).toBe("/login?next=%2Fincidents%3Fstatus%3Dopen%26page%3D2%23top");
      expect(new URLSearchParams(url.split("?")[1]).get("next")).toBe("/incidents?status=open&page=2#top");
    });
  });

  describe("failure modes", () => {
    it.each([undefined, ""])("is plain /login with nowhere to return to (%p)", (returnTo) => {
      expect(loginUrl(returnTo)).toBe("/login");
    });
  });
});

describe("safeReturnTo: only plain paths inside this app are accepted", () => {
  describe("happy path", () => {
    it.each(["/incidents", "/incidents/INC-1", "/suppliers?x=1&y=2", "/a#frag", "/account/profile"])("keeps the local path %j", (path) => {
      expect(safeReturnTo(path)).toBe(path);
    });
  });

  describe("edge cases", () => {
    it.each([null, undefined, ""])("falls back to the home page for %p", (value) => {
      expect(safeReturnTo(value)).toBe("/");
    });

    it.each(["/ /x", "/%2F/evil.com", "/incidencias/año?q=ñ"])("keeps unusual but harmless paths: %j", (path) => {
      expect(safeReturnTo(path)).toBe(path);
    });

    it("keeps an encoded tab encoded: the URL parser does not strip it", () => {
      expect(safeReturnTo("/a%09b")).toBe("/a%09b");
    });
  });

  describe("failure modes", () => {
    it.each([
      "https://evil.example",
      "http://evil.example/login",
      "//evil.example",
      "///evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "evil.example",
      "incidents",
      "\\evil.example",
      " /incidents",
      "?next=/x",
      "#x",
    ])("falls back to the home page for the foreign or malformed target %j", (value) => {
      expect(safeReturnTo(value)).toBe("/");
    });

    // Browsers drop tab, newline and carriage return while parsing a URL, so "/\t/evil.example" would become
    // "//evil.example": a different origin. Control characters are refused.
    it.each(["/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/\t\t/evil.example", "/\r\n/evil.example"])(
      "%j must not resolve to another origin",
      (input) => {
        expect(safeReturnTo(input)).toBe("/");
        expect(hostOf(safeReturnTo(input))).toBe("app.example");
      },
    );

    it.each(["/a\u0000b", "/\u0000/evil.example", "/a\u001fb", "/a\u007fb", "/a\u000bb", "/a\u000cb", "/a\tb", "/a\nb"])(
      "refuses control characters anywhere in the path: %j",
      (input) => {
        expect(safeReturnTo(input)).toBe("/");
      },
    );

    it("whatever it accepts resolves to this app's own origin", () => {
      const inputs = ["/incidents", "//evil.example", "/\\evil.example", "https://evil.example", "javascript:1", "/a/../b", "/%2F/x"];

      for (const input of inputs) expect(hostOf(safeReturnTo(input))).toBe("app.example");
    });
  });
});

describe("currentReturnTo reads ?next= from the address bar", () => {
  afterEach(() => window.history.pushState({}, "", "/"));

  describe("happy path", () => {
    it("returns the page to go back to", () => {
      window.history.pushState({}, "", "/login?next=%2Fincidents%3Fstatus%3Dopen");

      expect(currentReturnTo()).toBe("/incidents?status=open");
    });
  });

  describe("edge cases", () => {
    it("is the home page when there is no ?next=", () => {
      window.history.pushState({}, "", "/login");

      expect(currentReturnTo()).toBe("/");
    });

    it("is the home page when ?next= is empty", () => {
      window.history.pushState({}, "", "/login?next=");

      expect(currentReturnTo()).toBe("/");
    });

    it("uses the first ?next= when it is repeated", () => {
      window.history.pushState({}, "", "/login?next=%2Fa&next=%2F%2Fevil.example");

      expect(currentReturnTo()).toBe("/a");
    });
  });

  describe("failure modes", () => {
    it.each(["https%3A%2F%2Fevil.example", "%2F%2Fevil.example", "javascript%3Aalert(1)", "%2F%09%2Fevil.example"])(
      "refuses the foreign target %s",
      (encoded) => {
        window.history.pushState({}, "", `/login?next=${encoded}`);

        expect(currentReturnTo()).toBe("/");
      },
    );
  });
});
