/**
 * The route guard (`auth/RequireAuth.tsx`): renders its children only for a logged-in user; everyone else goes to
 * /login?next=<this page>. It is a UX gate, not the security boundary (the API answers 401 without a valid token),
 * but it must never show a protected view to someone who has no session, not even for one frame.
 *
 * Layout shared by every frontend test file: HAPPY PATH, EDGE CASES, FAILURE MODES. Arrange / Act / Assert.
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import RequireAuth from "@/auth/RequireAuth";
import * as api from "@/lib/api";
import { clearToken, setToken } from "@/lib/token";
import type { Me } from "@/types/auth";

const mockReplace = jest.fn();
let mockPathname = "/incidents";
jest.mock("next/navigation", () => {
  const router = { replace: (...args: unknown[]) => mockReplace(...args) }; // one stable object, as in Next
  return { useRouter: () => router, usePathname: () => mockPathname };
});
jest.mock("@/lib/api", () => ({ fetchMe: jest.fn(), login: jest.fn(), register: jest.fn(), updateMyProfile: jest.fn() }));

const fetchMe = jest.mocked(api.fetchMe);
const ME: Me = {
  id: "u1",
  email: "ana@example.com",
  role: "user",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  profile: { id: "p1", user_id: "u1", name: "Ana", contact_email: null, phone: null, address: null },
};

// If the guard ever renders this, the protected view was shown. Even one render counts.
const Protected = jest.fn(() => <p>contenido protegido</p>);

let auth: ReturnType<typeof useAuth>;
function Controls() {
  auth = useAuth();
  return null;
}

const tree = () => (
  <AuthProvider>
    <Controls />
    <RequireAuth>
      <Protected />
    </RequireAuth>
  </AuthProvider>
);

const goTo = (url: string) => window.history.pushState({}, "", url);

async function openProtectedView() {
  setToken("stored");
  fetchMe.mockResolvedValue(ME);
  const view = render(tree());
  await screen.findByText("contenido protegido");
  return view;
}

beforeEach(() => {
  localStorage.clear();
  fetchMe.mockReset();
  Protected.mockClear();
  mockReplace.mockReset();
  mockPathname = "/incidents";
  goTo("/incidents");
});

describe("RequireAuth", () => {
  describe("happy path", () => {
    it("with a valid session it renders the protected view and does not redirect", async () => {
      setToken("stored");
      fetchMe.mockResolvedValue(ME);

      render(tree());

      expect(await screen.findByText("contenido protegido")).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("while the session is being checked it shows a waiting message: no protected view, no redirect yet", async () => {
      setToken("stored");
      let answer!: (me: Me) => void;
      fetchMe.mockReturnValue(new Promise<Me>((resolve) => (answer = resolve)));

      render(tree());
      expect(screen.getByText("Comprobando la sesión…")).toBeInTheDocument();
      expect(Protected).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      await act(async () => answer(ME));

      expect(await screen.findByText("contenido protegido")).toBeInTheDocument();
      expect(screen.queryByText("Comprobando la sesión…")).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("without a session it sends the user to /login with the page to come back to, and renders nothing meanwhile", async () => {
      goTo("/incidents?status=open#top");

      const { container } = render(tree());

      await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fincidents%3Fstatus%3Dopen%23top");
      expect(container).toBeEmptyDOMElement();
    });

    it("from the home page the login URL carries no ?next=", async () => {
      goTo("/");
      mockPathname = "/";

      render(tree());

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
    });

    it("an explicit logout goes to plain /login: the next user does not inherit this page", async () => {
      goTo("/suppliers");
      await openProtectedView();

      act(() => auth.logout());

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
      expect(mockReplace).not.toHaveBeenCalledWith(expect.stringContaining("next="));
    });

    it("a token deleted behind the app's back (devtools, an extension) is noticed on the next navigation", async () => {
      const view = await openProtectedView();

      localStorage.removeItem("nexova.token"); // no event, no clearToken()
      mockPathname = "/suppliers";
      goTo("/suppliers");
      view.rerender(tree());

      await waitFor(() => expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument());
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fsuppliers");
    });
  });

  describe("failure modes", () => {
    it("without a session the protected view is never rendered, not even once", async () => {
      render(tree());

      await waitFor(() => expect(mockReplace).toHaveBeenCalled());

      expect(Protected).not.toHaveBeenCalled();
      expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument();
    });

    it("a stored token that /auth/me refuses is the same as no session", async () => {
      setToken("expired");
      fetchMe.mockRejectedValue(new Error("401"));

      render(tree());

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fincidents"));
      expect(Protected).not.toHaveBeenCalled();
    });

    it("a session that expires while the view is open removes it and goes to /login?next=<current page>", async () => {
      goTo("/suppliers");
      await openProtectedView();

      act(() => clearToken()); // what the API client does after a 401

      await waitFor(() => expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument());
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fsuppliers");
    });

    it("another tab logging out also removes the view", async () => {
      await openProtectedView();

      localStorage.removeItem("nexova.token");
      act(() => void window.dispatchEvent(new StorageEvent("storage", { key: "nexova.token", newValue: null })));

      await waitFor(() => expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument());
      expect(mockReplace).toHaveBeenCalled();
    });

    it("never shows the protected view for a session whose token is not in storage (storage blocked)", async () => {
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });
      jest.mocked(api.login).mockImplementation(async () => setToken("never-stored"));
      fetchMe.mockResolvedValue(ME);
      render(tree());
      await waitFor(() => expect(mockReplace).toHaveBeenCalled()); // anonymous: sent to /login

      await act(async () => auth.login("ana@example.com", "pw")); // "succeeds", but the token was not persisted

      await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(2)); // the guard sent the user back to /login
      expect(Protected).not.toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });
});
