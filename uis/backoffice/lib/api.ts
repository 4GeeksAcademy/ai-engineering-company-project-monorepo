import { clearToken, getToken } from "./auth";

const API_URL = "http://127.0.0.1:8000";

export async function api(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Comprueba que la API este ejecutandose."
    );
  }

  if (response.status === 401) {
    clearToken();

    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }

    throw new Error("Sesion no valida. Inicia sesion de nuevo.");
  }

  if (!response.ok) {
    let message = `Error del servidor (${response.status}).`;

    try {
      const data = await response.clone().json();

      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (typeof data?.message === "string") {
        message = data.message;
      }
    } catch {
      // La respuesta puede no contener JSON.
    }

    throw new Error(message);
  }

  return response;
}