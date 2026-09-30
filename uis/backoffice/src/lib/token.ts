// The API uses stateless JWT auth: the token lives here and travels in `Authorization: Bearer`.
// No cookies, no server session. localStorage keeps the login across reloads; the token
// expires by itself (ACCESS_TOKEN_EXPIRE_MINUTES on the API) and logging out just forgets it.
const KEY = "nexova.token";
const listeners = new Set<() => void>();

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // storage blocked (private mode, etc.): behave as logged out
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* nothing to persist to */
  }
  listeners.forEach((notify) => notify());
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
  listeners.forEach((notify) => notify());
}

/** Called whenever the token is set or cleared (login, logout, or a 401 from the API). */
export function onTokenChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
