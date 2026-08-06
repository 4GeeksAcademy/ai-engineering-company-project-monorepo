import { apiFetch } from "./authApi";

export type IncidentCategory =
  | "Almacen"
  | "Ultima_Milla"
  | "Logistica_Inversa"
  | "CX"
  | "Comercial"
  | "Tecnologia";

export type IncidentStatus = "open" | "in_progress" | "resolved" | "discarded";

export type IncidentOrigin = "customer" | "branch" | "internal";

export type IncidentBranch = "Los Ángeles" | "Zaragoza" | "Central";

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: IncidentBranch;
  created_at: string;
  updated_at: string;
}

export interface IncidentCreatePayload {
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: IncidentBranch;
}

export interface IncidentSummary {
  total: number;
  by_status: Record<IncidentStatus, number>;
  by_category: Record<IncidentCategory, number>;
  by_origin: Record<IncidentOrigin, number>;
  by_branch: Record<IncidentBranch, number>;
}

interface ApiFieldError {
  field: string;
  message: string;
}

interface ApiErrorPayload {
  error?: string;
  detail?: string | { error?: string; details?: ApiFieldError[] };
  details?: ApiFieldError[];
}

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function toFriendlyFieldName(field: string): string {
  if (field === "title") return "titulo";
  if (field === "description") return "descripcion";
  if (field === "category") return "categoria";
  if (field === "status") return "estado";
  if (field === "origin") return "origen";
  if (field === "branch") return "sede";
  return field;
}

function normalizeFieldErrorMessage(rawMessage: string, field: string): string {
  if (!rawMessage.trim()) {
    return `Revisa el campo ${toFriendlyFieldName(field)}.`;
  }

  return rawMessage
    .replace("El campo", "El campo")
    .replace("title", "titulo")
    .replace("description", "descripcion")
    .replace("category", "categoria")
    .replace("status", "estado")
    .replace("origin", "origen")
    .replace("branch", "sede");
}

export async function createIncident(payload: IncidentCreatePayload): Promise<Incident> {
  const response = await apiFetch("/api/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = await parseJson<ApiErrorPayload>(response);
    const error = new Error("No se pudo crear la incidencia.");
    (error as Error & { status?: number; payload?: ApiErrorPayload }).status = response.status;
    (error as Error & { status?: number; payload?: ApiErrorPayload }).payload = errorPayload ?? undefined;
    throw error;
  }

  const data = await parseJson<Incident>(response);
  if (!data) {
    throw new Error("La API devolvio una respuesta invalida al crear la incidencia.");
  }

  return data;
}

export async function listIncidents(filters: {
  status?: IncidentStatus;
  origin?: IncidentOrigin;
  branch?: IncidentBranch;
  category?: IncidentCategory;
}): Promise<Incident[]> {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.origin) params.set("origin", filters.origin);
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.category) params.set("category", filters.category);

  const query = params.toString();
  const endpoint = query ? `/api/incidents?${query}` : "/api/incidents";
  const response = await apiFetch(endpoint);

  if (!response.ok) {
    throw new Error("No se pudo cargar el listado de incidencias.");
  }

  const data = await parseJson<Incident[]>(response);
  return data ?? [];
}

export async function patchIncidentStatus(incidentId: string, status: IncidentStatus): Promise<Incident> {
  const response = await apiFetch(`/api/incidents/${incidentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const payload = await parseJson<ApiErrorPayload>(response);
    const rawMessage =
      payload?.error ||
      (typeof payload?.detail === "string" ? payload.detail : undefined) ||
      (typeof payload?.detail === "object" ? payload.detail.error : undefined) ||
      "No se pudo actualizar el estado de la incidencia.";
    throw new Error(rawMessage);
  }

  const data = await parseJson<Incident>(response);
  if (!data) {
    throw new Error("La API devolvio una respuesta invalida al actualizar el estado.");
  }

  return data;
}

export async function getIncidentsSummary(): Promise<IncidentSummary> {
  const response = await apiFetch("/api/incidents/summary");

  if (!response.ok) {
    throw new Error("No se pudo cargar el resumen de incidencias.");
  }

  const data = await parseJson<IncidentSummary>(response);
  if (!data) {
    throw new Error("La API devolvio una respuesta invalida al obtener el resumen.");
  }

  return data;
}

export async function extractIncidentFieldErrors(error: unknown): Promise<Record<string, string>> {
  const problem = error as Error & { status?: number; payload?: ApiErrorPayload };

  if (problem.status !== 400 || !problem.payload) {
    return {};
  }

  const detailsFromRoot = problem.payload.details;
  const detailsFromDetail =
    typeof problem.payload.detail === "object" && problem.payload.detail
      ? problem.payload.detail.details
      : undefined;

  const details = detailsFromRoot ?? detailsFromDetail ?? [];

  return details.reduce<Record<string, string>>((acc, detail) => {
    if (!detail.field) {
      return acc;
    }

    acc[detail.field] = normalizeFieldErrorMessage(detail.message, detail.field);
    return acc;
  }, {});
}
