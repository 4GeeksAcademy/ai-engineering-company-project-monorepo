import type { AnalyzeResponse } from "../types/incidents";
import type { Supplier, SupplierCreate, SupplierStatus } from "../types/suppliers";
import type { Me } from "../types/auth";
import { clearToken, getToken, setToken } from "./token";

// Vacío = mismo origen: en desarrollo el proxy de Vite reenvía /api a la API local.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((e: { loc?: unknown[]; msg?: string }) => {
          const field = e.loc?.slice(1).join(".");
          const message = (e.msg ?? "").replace(/^Value error, /, "");
          return field ? `${field}: ${message}` : message;
        })
        .join("; ");
    }
    return response.statusText;
  } catch {
    return response.statusText;
  }
}

// Every call to the API goes through here so it carries the bearer token. A 401 while holding
// a token means it expired (or the account was deleted/deactivated): forget it, which sends the
// user back to the login page.
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && token) clearToken();
  return response;
}

export async function login(email: string, password: string): Promise<void> {
  // OAuth2 password flow: form-encoded, and the field is called "username" but carries the email.
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    body: new URLSearchParams({ username: email, password }),
  });
  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response), response.status);
  }
  const { access_token } = await response.json();
  setToken(access_token);
}

export async function fetchMe(): Promise<Me> {
  const response = await apiFetch("/auth/me");
  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response), response.status);
  }
  return response.json();
}

export async function analyzeIncidentsFile(file: File): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch("/api/incidents/analyze", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response), response.status);
  }

  return response.json();
}

export async function downloadResultsCsv(): Promise<void> {
  const response = await apiFetch("/api/incidents/results/export");

  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response), response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "results.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function suppliersRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/suppliers${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response), response.status);
  }
  return response.json();
}

export const listSuppliers = () => suppliersRequest<Supplier[]>("");

export const createSupplier = (payload: SupplierCreate) =>
  suppliersRequest<Supplier>("", { method: "POST", body: JSON.stringify(payload) });

export const updateSupplierRate = (id: number, monthly_rate: number) =>
  suppliersRequest<Supplier>(`/${id}/rate`, { method: "PATCH", body: JSON.stringify({ monthly_rate }) });

export const setSupplierStatus = (id: number, status: SupplierStatus) =>
  suppliersRequest<Supplier>(`/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
