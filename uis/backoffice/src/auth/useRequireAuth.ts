import { useLocation } from "react-router-dom";
import { getStoredToken } from "../lib/api";
import { useAuth } from "./AuthProvider";

/**
 * Client layout guard (localStorage JWT). This repo has no Next.js app, so this
 * hook is the equivalent of a client layout — not middleware, which cannot read
 * localStorage unless the token is also in a cookie.
 */
export function useRequireAuth() {
  const location = useLocation();
  const { isLoading, user, sessionError, retrySession } = useAuth();
  const token = getStoredToken();
  const next = `${location.pathname}${location.search}`;
  const loginPath = `/login?next=${encodeURIComponent(next)}`;
  const isMissingToken = !token;
  const isInvalidToken = !isLoading && Boolean(token) && !user && !sessionError;
  const shouldRedirectToLogin = isMissingToken || isInvalidToken;

  return {
    token,
    user,
    isLoading,
    sessionError,
    retrySession,
    isMissingToken,
    isInvalidToken,
    shouldRedirectToLogin,
    loginPath,
  };
}
