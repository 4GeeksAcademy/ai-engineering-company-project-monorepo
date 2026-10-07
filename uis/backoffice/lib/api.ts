import { clearToken, getToken } from "./auth";

const API_URL = "http://127.0.0.1:8000";

export async function api(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearToken();

    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }

    throw new Error("Unauthorized");
  }

  return response;
}
