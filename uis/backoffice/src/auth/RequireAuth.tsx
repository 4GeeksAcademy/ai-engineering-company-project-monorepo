import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearToken, getToken } from "../lib/token";
import { useAuth } from "./AuthContext";

/**
 * Layout guard: renders the nested routes only for a logged-in user; everyone else goes to /login, which
 * sends them back here afterwards. Client-side only: the token lives in localStorage, which a server can't
 * read. It is a UX gate, not the security boundary: the API answers 401 to any call without a valid token.
 */
export default function RequireAuth() {
  const { status, loggedOut } = useAuth();
  const location = useLocation();
  // Re-read on every navigation: the token may have been removed without going through clearToken()
  // (devtools, an extension). Then clear it properly so the session state follows.
  const hasToken = getToken() !== null;

  useEffect(() => {
    if (status === "authenticated" && !hasToken) clearToken();
  }, [status, hasToken, location.key]);

  if (status === "loading") {
    return <p className="p-10 text-sm text-slate-400">Comprobando la sesión…</p>;
  }
  if (status === "anonymous") {
    // After an explicit logout, whoever logs in next starts from the home page, not from this user's last view.
    const from = loggedOut ? undefined : `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={from ? { from } : null} />;
  }
  if (!hasToken) return null; // never show a protected view without a token, even for one frame
  return <Outlet />;
}
