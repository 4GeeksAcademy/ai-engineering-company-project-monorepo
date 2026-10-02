"use client";

export const TOKEN_KEY = "healthcore_access_token";

type ApiErrorPayload = { detail?: unknown };

export class ApiRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const SAFE_API_MESSAGES = new Set([
  "Incorrect email or password",
  "Current password is incorrect",
  "Invalid or expired reset token",
  "Supplier not found",
  "Email is already registered",
  "Only admins may list users",
  "Only admins may change roles",
  "Only admins may change account status",
  "Password changes must use the password recovery flow",
  "Profile not found",
  "No successful incident analysis is available to export.",
  "The file is empty. Upload a CSV with a header row and at least one record.",
  "The file has no header row.",
  "The file is not valid UTF-8 text. Export it as a UTF-8 CSV.",
  "Upload a .csv file.",
  "The uploaded file could not be read. Please try again.",
  "The analysis results could not be exported. Please try again.",
]);

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
    if (Array.isArray(detail)) return "Please check the information and try again.";
    if (typeof detail === "string" && SAFE_API_MESSAGES.has(detail)) return detail;
  }
  return fallback;
}

export async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const text = await response.text();
  let payload: unknown;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiRequestError(fallback);
    }
  }
  if (!response.ok) throw new ApiRequestError(apiError(payload, fallback));
  return payload as T;
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
