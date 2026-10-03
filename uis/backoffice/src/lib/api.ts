import type {
  Incident,
  IncidentFacets,
  IncidentFilters,
  IncidentPage,
  IncidentSummary,
  StatusChangeInput,
} from "@repo/shared-types";
import type { AnalyzeResponse } from "../types/incidents";
import type { Supplier, SupplierCreate, SupplierStatus } from "../types/suppliers";
import type { Me, Profile, ProfileUpdate, SignUpOut, SignUpPayload } from "../types/auth";
import { clearToken, getToken, setToken } from "./token";

// Vacío = mismo origen: los rewrites de next.config.mjs reenvían las llamadas a la API local.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** Per-field messages of a 422 (FastAPI validation), keyed by the body field name. */
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return new ApiError(body.detail, response.status);
    if (Array.isArray(body.detail)) {
      const fieldErrors: Record<string, string> = {};
      const message = body.detail
        .map((e: { loc?: unknown[]; msg?: string }) => {
          const field = e.loc?.slice(1).join(".");
          const text = (e.msg ?? "").replace(/^Value error, /, "");
          if (field && !(field in fieldErrors)) fieldErrors[field] = text;
          return field ? `${field}: ${text}` : text;
        })
        .join("; ");
      return new ApiError(message, response.status, fieldErrors);
    }
  } catch {
    /* not JSON: fall back to the status text */
  }
  return new ApiError(response.statusText, response.status);
}

// Every call to the API goes through here so it carries the bearer token. A 401 while holding
// a token means it expired (or the account was deleted/deactivated): forget it, which sends the
// user back to the login page.
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    // fetch only rejects when the request never got an answer (offline, API down, DNS...).
    throw new ApiError("No response from the server", 0);
  }
  // Only if it is still the stored token: a late 401 for an old one must not end a newer session.
  if (response.status === 401 && token && getToken() === token) clearToken();
  return response;
}

export async function login(email: string, password: string): Promise<void> {
  // OAuth2 password flow: form-encoded, and the field is called "username" but carries the email.
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    body: new URLSearchParams({ username: email, password }),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  const { access_token } = await response.json();
  setToken(access_token);
}

/** Public sign-up (POST /users). Empty optional profile fields are left out rather than sent blank. */
export async function register(payload: SignUpPayload): Promise<SignUpOut> {
  const body = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""));
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json();
}

export async function fetchMe(): Promise<Me> {
  const response = await apiFetch("/auth/me");
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json();
}

/** Edits the session's own profile; the owner comes from the bearer token, never from the body. */
export async function updateMyProfile(update: ProfileUpdate): Promise<Profile> {
  const response = await apiFetch("/profiles/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  if (!response.ok) {
    throw await toApiError(response);
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
    throw await toApiError(response);
  }

  return response.json();
}

export async function downloadResultsCsv(): Promise<void> {
  const response = await apiFetch("/api/incidents/results/export");

  if (!response.ok) {
    throw await toApiError(response);
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
    throw await toApiError(response);
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

// ---- Incident manager -----------------------------------------------------------------------

export type SortField = "created_at" | "id" | "updated_at";
export type SortOrder = "asc" | "desc";

function filtersQuery(filters: IncidentFilters): URLSearchParams {
  const params = new URLSearchParams();
  filters.status.forEach((v) => params.append("status", v));
  filters.category.forEach((v) => params.append("category", v));
  filters.origin.forEach((v) => params.append("origin", v));
  for (const key of ["branch", "agent_id", "client_company", "q", "date_from", "date_to"] as const) {
    if (filters[key].trim()) params.set(key, filters[key].trim());
  }
  return params;
}

async function incidentsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/incidents${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json();
}

export function listIncidents(
  filters: IncidentFilters,
  options: { sort: SortField; order: SortOrder; page: number; pageSize: number },
): Promise<IncidentPage> {
  const params = filtersQuery(filters);
  params.set("sort", options.sort);
  params.set("order", options.order);
  params.set("page", String(options.page));
  params.set("page_size", String(options.pageSize));
  return incidentsRequest<IncidentPage>(`?${params}`);
}

export const getIncidentSummary = (filters: IncidentFilters) =>
  incidentsRequest<IncidentSummary>(`/summary?${filtersQuery(filters)}`);

export const getIncidentFacets = () => incidentsRequest<IncidentFacets>("/facets");

export const getIncident = (incidentId: string) =>
  incidentsRequest<Incident>(`/${encodeURIComponent(incidentId)}`);

/** What the form sends. Optional text fields are `null` to clear them (edit) and left out when empty (create). */
export type IncidentFields = {
  title: string;
  description: string;
  category: string;
  origin: string;
  branch: string;
  client_company: string | null;
  agent_id: string | null;
  customer_email: string | null;
};

export const createIncident = (payload: IncidentFields) =>
  incidentsRequest<Incident>("", { method: "POST", body: JSON.stringify(payload) });

export const updateIncident = (incidentId: string, changes: Partial<IncidentFields>) =>
  incidentsRequest<Incident>(`/${encodeURIComponent(incidentId)}`, { method: "PATCH", body: JSON.stringify(changes) });

export const changeIncidentStatus = (incidentId: string, change: StatusChangeInput) =>
  incidentsRequest<Incident>(`/${encodeURIComponent(incidentId)}/status`, { method: "PATCH", body: JSON.stringify(change) });
