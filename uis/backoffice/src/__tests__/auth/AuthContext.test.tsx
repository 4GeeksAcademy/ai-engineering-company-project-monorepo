/**
 * The session state of the app (`auth/AuthContext.tsx`): who is logged in, restoring it on load, keeping tabs in
 * step, and the sign-up + automatic login flow. The HTTP layer is mocked; the token store is the real one, on jsdom's
 * localStorage.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import * as api from "@/lib/api";
import { clearToken, getToken, setToken } from "@/lib/token";
import type { Me } from "@/types/auth";

jest.mock("@/lib/api", () => ({ fetchMe: jest.fn(), login: jest.fn(), register: jest.fn(), updateMyProfile: jest.fn() }));

const fetchMe = jest.mocked(api.fetchMe);
const apiLogin = jest.mocked(api.login);
const apiRegister = jest.mocked(api.register);
const updateMyProfile = jest.mocked(api.updateMyProfile);

const meOf = (email: string, name = "Ana"): Me => ({
  id: `id-of-${email}`,
  email,
  role: "user",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  profile: { id: "p1", user_id: `id-of-${email}`, name, contact_email: null, phone: null, address: null },
});

let auth: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="email">{auth.user?.email ?? "-"}</p>
      <p data-testid="name">{auth.user?.profile.name ?? "-"}</p>
      <p data-testid="loggedOut">{String(auth.loggedOut)}</p>
    </div>
  );
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
const text = (id: string) => screen.getByTestId(id).textContent;
const waitForStatus = (expected: string) => waitFor(() => expect(text("status")).toBe(expected));
const storageEvent = (init: StorageEventInit) => act(() => void window.dispatchEvent(new StorageEvent("storage", init)));
const signedInAs = async (email: string, name = "Ana") => {
  setToken("stored");
  fetchMe.mockResolvedValue(meOf(email, name));
  renderProvider();
  await waitForStatus("authenticated");
};

beforeEach(() => {
  localStorage.clear();
  [fetchMe, apiLogin, apiRegister, updateMyProfile].forEach((mock) => mock.mockReset());
  // The real login stores the token before the context asks who the user is.
  apiLogin.mockImplementation(async () => setToken("fresh.token"));
});

describe("AuthProvider", () => {
  describe("happy path", () => {
    it("restoring: is anonymous, without asking the API, when there is no stored token", async () => {
      renderProvider();

      await waitForStatus("anonymous");

      expect(fetchMe).not.toHaveBeenCalled();
      expect(text("email")).toBe("-");
    });

    it("restoring: is loading until /auth/me answers, then authenticated", async () => {
      setToken("stored");
      let answer!: (me: Me) => void;
      fetchMe.mockReturnValue(new Promise<Me>((resolve) => (answer = resolve)));

      renderProvider();
      expect(text("status")).toBe("loading");
      await act(async () => answer(meOf("ana@example.com")));

      expect(text("status")).toBe("authenticated");
      expect(text("email")).toBe("ana@example.com");
      expect(fetchMe).toHaveBeenCalledTimes(1);
    });

    it("login: authenticates with the credentials, then loads the user", async () => {
      fetchMe.mockResolvedValue(meOf("ana@example.com"));
      renderProvider();
      await waitForStatus("anonymous");

      await act(async () => auth.login("ana@example.com", "s3cret-pass"));

      expect(apiLogin).toHaveBeenCalledWith("ana@example.com", "s3cret-pass");
      expect(text("status")).toBe("authenticated");
      expect(text("email")).toBe("ana@example.com");
    });

    it("logout: forgets the token and the user, and marks the logout as explicit", async () => {
      await signedInAs("ana@example.com");

      act(() => auth.logout());

      expect(getToken()).toBeNull();
      expect([text("status"), text("email"), text("loggedOut")]).toEqual(["anonymous", "-", "true"]);
    });

    it("register: creates the account, logs in with the same credentials and reports 'authenticated'", async () => {
      apiRegister.mockResolvedValue({} as Awaited<ReturnType<typeof api.register>>);
      fetchMe.mockResolvedValue(meOf("new@example.com", "Nueva"));
      renderProvider();
      await waitForStatus("anonymous");
      let result: string | undefined;

      await act(async () => {
        result = await auth.register({ email: "new@example.com", password: "s3cret-pass", name: "Nueva" });
      });

      expect(apiRegister).toHaveBeenCalledWith({ email: "new@example.com", password: "s3cret-pass", name: "Nueva" });
      expect(apiLogin).toHaveBeenCalledWith("new@example.com", "s3cret-pass");
      expect([result, text("status")]).toEqual(["authenticated", "authenticated"]);
    });

    it("profile: saveProfile replaces the profile and keeps the rest of the user", async () => {
      await signedInAs("ana@example.com", "Ana");
      updateMyProfile.mockResolvedValue({ ...meOf("ana@example.com").profile, name: "Ana María" });

      await act(async () => auth.saveProfile({ name: "Ana María" }));

      expect(updateMyProfile).toHaveBeenCalledWith({ name: "Ana María" });
      expect([text("name"), text("email")]).toEqual(["Ana María", "ana@example.com"]);
    });

    it("profile: refreshUser re-reads /auth/me", async () => {
      await signedInAs("ana@example.com", "Ana");
      fetchMe.mockResolvedValueOnce(meOf("ana@example.com", "Ana (editada en otro sitio)"));

      await act(async () => auth.refreshUser());

      expect(text("name")).toBe("Ana (editada en otro sitio)");
    });

    it("tabs: another tab logging out also ends the session here", async () => {
      await signedInAs("ana@example.com");

      localStorage.removeItem("nexova.token");
      storageEvent({ key: "nexova.token", newValue: null });

      expect([text("status"), text("email")]).toEqual(["anonymous", "-"]);
    });

    it("tabs: switches to the other user when another tab logs in as someone else", async () => {
      setToken("ana.token");
      fetchMe.mockResolvedValueOnce(meOf("ana@example.com"));
      renderProvider();
      await waitForStatus("authenticated");
      fetchMe.mockResolvedValueOnce(meOf("bob@example.com"));

      localStorage.setItem("nexova.token", "bob.token");
      storageEvent({ key: "nexova.token", newValue: "bob.token" });

      await waitFor(() => expect(text("email")).toBe("bob@example.com"));
      expect(text("status")).toBe("authenticated");
      expect(fetchMe).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("restoring: an expired restore is not counted as an explicit logout", async () => {
      setToken("expired");
      fetchMe.mockRejectedValue(new Error("401"));

      renderProvider();
      await waitForStatus("anonymous");

      expect(text("loggedOut")).toBe("false");
    });

    it("restoring: a late failure from a provider that went away does not forget a token that is still valid", async () => {
      setToken("stored");
      let fail!: (reason: Error) => void;
      fetchMe.mockReturnValue(new Promise<Me>((_, reject) => (fail = reject)));
      const { unmount } = renderProvider();
      unmount();

      await act(async () => fail(new Error("401")));

      expect(getToken()).toBe("stored"); // that answer no longer belongs to anybody
    });

    it("restoring: a late success from a provider that went away touches no state", async () => {
      setToken("stored");
      let answer!: (me: Me) => void;
      fetchMe.mockReturnValue(new Promise<Me>((resolve) => (answer = resolve)));
      const errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
      const { unmount } = renderProvider();
      unmount();

      await act(async () => answer(meOf("ana@example.com")));

      expect(errors).not.toHaveBeenCalled();
      errors.mockRestore();
    });

    it("login: logging in again while a session is open never flashes the logged-out state", async () => {
      setToken("ana.token");
      fetchMe.mockResolvedValueOnce(meOf("ana@example.com"));
      renderProvider();
      await waitForStatus("authenticated");
      // Bob logs in from this same tab: his token is stored first, then /auth/me is still pending.
      let answer!: (me: Me) => void;
      fetchMe.mockReturnValueOnce(new Promise<Me>((resolve) => (answer = resolve)));
      let login!: Promise<void>;

      act(() => {
        login = auth.login("bob@example.com", "pw");
      });
      await waitFor(() => expect(getToken()).toBe("fresh.token"));
      expect(text("status")).toBe("authenticated"); // no drop to "anonymous", which would bounce to /login
      await act(async () => {
        answer(meOf("bob@example.com"));
        await login;
      });

      expect(text("email")).toBe("bob@example.com");
    });

    it("login: logging in again after an explicit logout clears the logged-out flag", async () => {
      await signedInAs("ana@example.com");
      act(() => auth.logout());
      expect(text("loggedOut")).toBe("true");

      await act(async () => auth.login("ana@example.com", "pw"));

      expect([text("loggedOut"), text("status")]).toEqual(["false", "authenticated"]);
    });

    it("tabs: another tab clearing all the storage also ends the session (the event has no key)", async () => {
      await signedInAs("ana@example.com");

      localStorage.clear();
      storageEvent({ key: null });

      expect(text("status")).toBe("anonymous");
    });

    it("tabs: ignores storage changes to other keys", async () => {
      await signedInAs("ana@example.com");

      storageEvent({ key: "theme", newValue: "dark" });

      expect(text("status")).toBe("authenticated");
      expect(fetchMe).toHaveBeenCalledTimes(1);
    });

    it("profile: saveProfile does not invent a user when nobody is logged in", async () => {
      updateMyProfile.mockResolvedValue(meOf("ghost@example.com").profile);
      renderProvider();
      await waitForStatus("anonymous");

      await act(async () => auth.saveProfile({ name: "x" }));

      expect([text("email"), text("status")]).toEqual(["-", "anonymous"]);
    });
  });

  describe("failure modes", () => {
    it("restoring: only trusts the token once /auth/me accepts it: a rejected one is forgotten", async () => {
      setToken("expired");
      fetchMe.mockRejectedValue(new Error("401"));

      renderProvider();
      await waitForStatus("anonymous");

      expect(getToken()).toBeNull();
      expect(text("email")).toBe("-");
    });

    it("session ended by a 401 (the API client forgets the token): drops the session, and that is not a logout", async () => {
      await signedInAs("ana@example.com");

      act(() => clearToken());

      expect([text("status"), text("email"), text("loggedOut")]).toEqual(["anonymous", "-", "false"]);
    });

    it("login: wrong credentials reject with the API's error and leave the user anonymous", async () => {
      const failure = new Error("Incorrect email or password");
      apiLogin.mockRejectedValue(failure);
      renderProvider();
      await waitForStatus("anonymous");

      await act(async () => {
        await expect(auth.login("ana@example.com", "wrong")).rejects.toBe(failure);
      });

      expect(text("status")).toBe("anonymous");
      expect(fetchMe).not.toHaveBeenCalled();
    });

    it("register: reports 'created' (never a failed sign-up) if the account exists but the automatic login fails", async () => {
      apiRegister.mockResolvedValue({} as Awaited<ReturnType<typeof api.register>>);
      apiLogin.mockRejectedValue(new Error("network"));
      renderProvider();
      await waitForStatus("anonymous");
      let result: string | undefined;

      await act(async () => {
        result = await auth.register({ email: "new@example.com", password: "s3cret-pass" });
      });

      expect([result, text("status")]).toEqual(["created", "anonymous"]);
    });

    it("register: a refused sign-up rejects with the API's error and never tries to log in", async () => {
      const duplicate = new Error("already exists");
      apiRegister.mockRejectedValue(duplicate);
      renderProvider();
      await waitForStatus("anonymous");

      await act(async () => {
        await expect(auth.register({ email: "new@example.com", password: "s3cret-pass" })).rejects.toBe(duplicate);
      });

      expect(apiLogin).not.toHaveBeenCalled();
      expect(text("status")).toBe("anonymous");
    });

    it("tabs: does not trust a token another tab stored if /auth/me refuses it", async () => {
      renderProvider();
      await waitForStatus("anonymous");
      fetchMe.mockRejectedValueOnce(new Error("401"));

      localStorage.setItem("nexova.token", "forged");
      storageEvent({ key: "nexova.token", newValue: "forged" });

      await waitFor(() => expect(getToken()).toBeNull());
      expect(text("status")).toBe("anonymous");
    });

    it("profile: a rejected save leaves the user as it was", async () => {
      await signedInAs("ana@example.com", "Ana");
      updateMyProfile.mockRejectedValue(new Error("422"));

      await act(async () => {
        await expect(auth.saveProfile({ name: "" })).rejects.toThrow("422");
      });

      expect(text("name")).toBe("Ana");
    });

    it("useAuth: refuses to be used outside <AuthProvider>", () => {
      const quiet = jest.spyOn(console, "error").mockImplementation(() => undefined);

      expect(() => render(<Probe />)).toThrow("useAuth must be used inside <AuthProvider>");

      quiet.mockRestore();
    });
  });
});
