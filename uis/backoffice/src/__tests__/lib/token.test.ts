/**
 * Session-token store (`lib/token.ts`): where the JWT lives between page loads and how the rest of the app learns
 * that it changed.
 *
 * Layout shared by every frontend test file: one `describe` per function (or per area), and inside each the same
 * three blocks in the same order: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { clearToken, getToken, onTokenChange, onTokenChangeInOtherTab, setToken } from "@/lib/token";

const KEY = "nexova.token";

// What a storage failure looks like to the code: private mode, blocked site data, quota.
function breakStorage(method: "getItem" | "setItem" | "removeItem") {
  return jest.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new DOMException("blocked", "SecurityError");
  });
}

const fireStorageEvent = (init: StorageEventInit) => window.dispatchEvent(new StorageEvent("storage", init));

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

describe("getToken / setToken / clearToken", () => {
  describe("happy path", () => {
    it("returns what was stored, under the nexova.token key", () => {
      setToken("abc.def.ghi");

      expect(getToken()).toBe("abc.def.ghi");
      expect(localStorage.getItem(KEY)).toBe("abc.def.ghi");
    });

    it("forgets the token on logout", () => {
      setToken("abc");

      clearToken();

      expect(getToken()).toBeNull();
      expect(localStorage.getItem(KEY)).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("is null when nobody has logged in", () => {
      expect(getToken()).toBeNull();
    });

    it("replaces the previous token on a new login", () => {
      setToken("first");
      setToken("second");

      expect(getToken()).toBe("second");
    });

    it("clearing when there is no token is harmless", () => {
      expect(() => clearToken()).not.toThrow();
      expect(getToken()).toBeNull();
    });

    it("does not touch other keys in storage", () => {
      localStorage.setItem("other", "keep me");

      setToken("abc");
      clearToken();

      expect(localStorage.getItem("other")).toBe("keep me");
    });

    it("stores the token as-is, without any trimming or encoding", () => {
      setToken("  spaced token  ");

      expect(getToken()).toBe("  spaced token  ");
    });
  });

  describe("failure modes (storage blocked: private mode, disabled site data)", () => {
    it("reading behaves as logged out instead of crashing", () => {
      setToken("abc");
      breakStorage("getItem");

      expect(getToken()).toBeNull();
    });

    it("writing does not throw, and the listeners still hear about the change", () => {
      breakStorage("setItem");
      const listener = jest.fn();
      const off = onTokenChange(listener);

      expect(() => setToken("abc")).not.toThrow();

      expect(listener).toHaveBeenCalledTimes(1);
      off();
    });

    it("clearing does not throw, and the listeners still hear about the change", () => {
      breakStorage("removeItem");
      const listener = jest.fn();
      const off = onTokenChange(listener);

      expect(() => clearToken()).not.toThrow();

      expect(listener).toHaveBeenCalledTimes(1);
      off();
    });
  });
});

describe("onTokenChange (this tab)", () => {
  describe("happy path", () => {
    it("notifies on login and on logout", () => {
      const listener = jest.fn();
      const off = onTokenChange(listener);

      setToken("abc");
      clearToken();

      expect(listener).toHaveBeenCalledTimes(2);
      off();
    });

    it("notifies after the new value is already readable", () => {
      const seen: (string | null)[] = [];
      const off = onTokenChange(() => seen.push(getToken()));

      setToken("abc");
      clearToken();

      expect(seen).toEqual(["abc", null]);
      off();
    });

    it("notifies every listener", () => {
      const [a, b] = [jest.fn(), jest.fn()];
      const offs = [onTokenChange(a), onTokenChange(b)];

      setToken("abc");

      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
      offs.forEach((off) => off());
    });
  });

  describe("edge cases", () => {
    it("unsubscribing one listener leaves the others alone", () => {
      const [a, b] = [jest.fn(), jest.fn()];
      const offA = onTokenChange(a);
      const offB = onTokenChange(b);
      offA();

      setToken("abc");

      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledTimes(1);
      offB();
    });
  });

  describe("failure modes", () => {
    it("stops notifying once unsubscribed", () => {
      const listener = jest.fn();
      onTokenChange(listener)();

      setToken("abc");

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe("onTokenChangeInOtherTab", () => {
  describe("happy path", () => {
    it("reports the new token when another tab logs in", () => {
      const listener = jest.fn();
      const off = onTokenChangeInOtherTab(listener);

      localStorage.setItem(KEY, "from-other-tab");
      fireStorageEvent({ key: KEY, newValue: "from-other-tab" });

      expect(listener).toHaveBeenCalledWith("from-other-tab");
      off();
    });

    it("reports null when another tab logs out", () => {
      setToken("abc");
      const listener = jest.fn();
      const off = onTokenChangeInOtherTab(listener);

      localStorage.removeItem(KEY);
      fireStorageEvent({ key: KEY, newValue: null });

      expect(listener).toHaveBeenCalledWith(null);
      off();
    });
  });

  describe("edge cases", () => {
    it("reports null when another tab clears the whole storage (the event has no key)", () => {
      setToken("abc");
      const listener = jest.fn();
      const off = onTokenChangeInOtherTab(listener);

      localStorage.clear();
      fireStorageEvent({ key: null });

      expect(listener).toHaveBeenCalledWith(null);
      off();
    });

    it("ignores changes to unrelated keys", () => {
      const listener = jest.fn();
      const off = onTokenChangeInOtherTab(listener);

      fireStorageEvent({ key: "something.else", newValue: "x" });

      expect(listener).not.toHaveBeenCalled();
      off();
    });

    it("is not triggered by this tab's own setToken/clearToken", () => {
      const listener = jest.fn();
      const off = onTokenChangeInOtherTab(listener);

      setToken("abc");
      clearToken();

      expect(listener).not.toHaveBeenCalled();
      off();
    });
  });

  describe("failure modes", () => {
    it("stops listening once unsubscribed", () => {
      const listener = jest.fn();
      onTokenChangeInOtherTab(listener)();

      fireStorageEvent({ key: KEY, newValue: "x" });

      expect(listener).not.toHaveBeenCalled();
    });

    it("reads null (not a crash) if the storage became unreadable meanwhile", () => {
      const listener = jest.fn();
      const off = onTokenChangeInOtherTab(listener);
      breakStorage("getItem");

      fireStorageEvent({ key: KEY, newValue: "x" });

      expect(listener).toHaveBeenCalledWith(null);
      off();
    });
  });
});
