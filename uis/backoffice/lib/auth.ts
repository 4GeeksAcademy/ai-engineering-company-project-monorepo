"use client";

export const TOKEN_KEY = "healthcore_access_token";

type ApiErrorPayload = { detail?: unknown };

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function apiError(payload: unknown, fallback = "The API request failed."): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as ApiErrorPayload).detail;
    return Array.isArray(detail)
      ? detail.map((issue) => typeof issue === "object" && issue && "msg" in issue ? String(issue.msg) : String(issue)).join("; ")
      : String(detail);
  }
  return fallback;
}

export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (response.status === 401) {
    clearToken();
    window.location.replace("/login");
  }
  return response;
}
