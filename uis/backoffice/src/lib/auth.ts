// Client-side session: the JWT from POST /auth/login lives in localStorage.
// Only call these from client components ("use client"), after hydration.

import { UserFacingError } from "@/lib/errors";

const TOKEN_KEY = "nexova.accessToken";
// Fired on this tab whenever the token changes; other tabs get the native "storage" event.
const TOKEN_EVENT = "nexova:token";

export const LOGIN_PATH = "/login";
export const HOME_PATH = "/";

function notify() {
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // storage blocked (private mode, disabled site data)
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    throw new UserFacingError(
      "Tu navegador está bloqueando el almacenamiento de este sitio, así que no podemos mantener la sesión. Permítelo e inténtalo de nuevo.",
    );
  }
  notify();
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing stored */
  }
  notify();
}

/** Calls `onChange` when the token changes in this tab or another one. Returns the unsubscribe function. */
export function subscribeToToken(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === TOKEN_KEY) onChange();
  };
  window.addEventListener(TOKEN_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(TOKEN_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function tokenClaims(token: string): { exp?: unknown; sub?: unknown } | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function tokenExpiry(token: string): number | null {
  const exp = tokenClaims(token)?.exp;
  return typeof exp === "number" ? exp : null;
}

/** `sub` of the stored token: the internal user id (never an email or a name). Null without a readable token. */
export function getUserId(): string | null {
  const token = getToken();
  const sub = token ? tokenClaims(token)?.sub : null;
  return typeof sub === "string" && sub ? sub : null;
}

/**
 * True if there is a token and its `exp` is still in the future. The signature is
 * checked by the API: any 401 from a protected call ends the session anyway.
 */
export function isTokenValid(token: string | null = getToken()): boolean {
  if (!token) return false;
  const exp = tokenExpiry(token);
  return exp !== null && exp * 1000 > Date.now();
}

export function redirectToLogin(): void {
  if (window.location.pathname !== LOGIN_PATH) window.location.replace(LOGIN_PATH);
}

export function logout(): void {
  clearToken();
  redirectToLogin();
}
