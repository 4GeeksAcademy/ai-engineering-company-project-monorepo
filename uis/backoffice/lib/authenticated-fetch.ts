import { TOKEN_STORAGE_KEY } from "@/lib/auth";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

export function logout() {
  clearSession();
  redirectToLogin();
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);

  if (!token) {
    logout();
    throw new AuthenticationRequiredError();
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    logout();
    throw new AuthenticationRequiredError();
  }

  return response;
}