
import type {
  Incident,
  IncidentInput,
  IncidentStatus,
  IncidentSummary,
} from "./types";

const BASE_URL = "/api/incidents";

type IncidentFilters = Partial<
  Pick<IncidentInput, "status" | "origin" | "branch" | "category">
>;

export class IncidentApiError extends Error {
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "IncidentApiError";
    this.field = field;
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new IncidentApiError(
      "No se pudo conectar con el servidor. Inténtalo de nuevo."
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;

    if (
      response.status === 400 &&
      detail &&
      typeof detail === "object" &&
      typeof detail.message === "string"
    ) {
      throw new IncidentApiError(
        detail.message,
        detail.field
      );
    }

    if (response.status === 400) {
      throw new IncidentApiError(
        typeof detail === "string"
          ? detail
          : "Comprueba los datos introducidos."
      );
    }

    if (response.status === 404) {
      throw new IncidentApiError(
        "La incidencia solicitada no existe."
      );
    }

    throw new IncidentApiError(
      "Ha ocurrido un error. Inténtalo de nuevo."
    );
  }

  return response.json() as Promise<T>;
}

export function fetchIncidents(
  filters: IncidentFilters = {}
): Promise<Incident[]> {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return request<Incident[]>(
    query ? `${BASE_URL}?${query}` : BASE_URL
  );
}

export function fetchIncident(
  id: number
): Promise<Incident> {
  return request<Incident>(`${BASE_URL}/${id}`);
}

export function createIncident(
  data: IncidentInput
): Promise<Incident> {
  return request<Incident>(BASE_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateIncidentStatus(
  id: number,
  status: IncidentStatus
): Promise<Incident> {
  return request<Incident>(
    `${BASE_URL}/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

export function fetchIncidentSummary():
  Promise<IncidentSummary> {
  return request<IncidentSummary>(
    `${BASE_URL}/summary`
  );
}
