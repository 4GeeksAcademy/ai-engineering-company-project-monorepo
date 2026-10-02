// lib/api.ts — Helper de fetch con autenticación JWT
//
// Propósito: Proveer funciones reutilizables para llamar a la API
// con el token JWT adjunto automáticamente en el header Authorization.
//
// Funciones:
// - authHeaders(): devuelve headers con token si existe
// - apiPost(url, body): POST con auth header
// - apiGet(url): GET con auth header
// - apiPut(url, body): PUT con auth header
// - apiPatch(url, body): PATCH con auth header
//
// Uso: import { apiGet, apiPost, apiPut, apiPatch } from "@/lib/api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Obtiene los headers de autenticación desde localStorage.
 * 
 * Si el usuario tiene un token JWT almacenado, lo incluye
 * en el header Authorization: Bearer <token>.
 * Solo se ejecuta en el navegador (localStorage no existe en SSR).
 * 
 * Returns: HeadersInit con Content-Type y opcionalmente Authorization.
 */
export function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Realiza una petición GET a la API.
 * 
 * Útil para obtener datos (suppliers, perfil, etc.).
 * El token se adjunta automáticamente si existe.
 * 
 * @param path - Ruta relativa (ej: "/suppliers/", "/auth/me")
 * @returns Respuesta parseada como JSON
 */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw { status: response.status, detail: await response.json().catch(() => ({})) };
  }

  return response.json();
}

/**
 * Realiza una petición POST a la API.
 * 
 * Útil para crear recursos (login, registro, nuevo proveedor).
 * El token se adjunta automáticamente si existe.
 * 
 * @param path - Ruta relativa (ej: "/auth/login", "/users/")
 * @param body - Objeto con los datos a enviar
 * @returns Respuesta parseada como JSON
 */
export async function apiPost<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw { status: response.status, detail: await response.json().catch(() => ({})) };
  }

  return response.json();
}

/**
 * Realiza una petición PUT a la API.
 * 
 * Útil para actualizar recursos (editar perfil, etc.).
 * El token se adjunta automáticamente si existe.
 * 
 * @param path - Ruta relativa (ej: "/profiles/me")
 * @param body - Objeto con los datos a actualizar
 * @returns Respuesta parseada como JSON
 */
export async function apiPut<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw { status: response.status, detail: await response.json().catch(() => ({})) };
  }

  return response.json();
}

/**
 * Realiza una petición PATCH a la API.
 * 
 * Útil para actualizaciones parciales (ej: cambiar estado de incidencia).
 * El token se adjunta automáticamente si existe.
 * 
 * @param path - Ruta relativa (ej: "/api/incidents/1/status")
 * @param body - Objeto con los datos parciales a actualizar
 * @returns Respuesta parseada como JSON
 */
export async function apiPatch<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw { status: response.status, detail: await response.json().catch(() => ({})) };
  }

  return response.json();
}