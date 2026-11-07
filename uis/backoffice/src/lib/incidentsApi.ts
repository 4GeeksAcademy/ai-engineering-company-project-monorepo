import { ApiError, apiFetch, apiJson, type ApiOptions } from "@/lib/apiClient";
import { statusMessage } from "@/lib/errors";

export { ApiError } from "@/lib/apiClient";

export type ProblemKind = "missing" | "invalid";

export type AnalysisResult = {
  total_records: number;
  valid_records: number;
  invalid_records: number;
  invalid_breakdown: Record<string, number>;
  invalid_by_field: Record<string, Partial<Record<ProblemKind, number>>>;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  scored_tickets: number;
  closed_tickets: number;
  average_score: number | null;
  score_breakdown: Record<string, number>;
  labels: { rules: Record<string, string>; problems: Record<string, string>; scores: Record<string, string> };
};

const ANALYSIS_ERRORS: Record<number, string> = {
  400: "El archivo está vacío o no está guardado en UTF-8.",
  413: "El archivo supera el límite de 5 MB.",
  415: "Solo se aceptan archivos .csv.",
  422: "El archivo no tiene el formato esperado: usa el CSV exportado del helpdesk, con todas sus columnas.",
};
/** Uploads can take longer than a regular call. */
const ANALYSIS_TIMEOUT_MS = 60_000;

export async function analyzeIncidents(file: File): Promise<AnalysisResult> {
  const body = new FormData();
  body.append("file", file);
  try {
    return await apiJson<AnalysisResult>("/api/incidents/analyze", {
      method: "POST",
      body,
      fallback: "No se pudo analizar el archivo",
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
    });
  } catch (reason) {
    if (reason instanceof ApiError && reason.kind === "http" && ANALYSIS_ERRORS[reason.status]) {
      throw new ApiError(reason.status, [ANALYSIS_ERRORS[reason.status]]);
    }
    throw reason;
  }
}

export async function downloadResultsCsv(): Promise<void> {
  const fallback = "No se pudo descargar el CSV";
  let response: Response;
  try {
    response = await apiFetch("/api/incidents/results/export", { fallback });
  } catch (reason) {
    // 404: the server no longer has the analysis (e.g. it restarted).
    if (reason instanceof ApiError && reason.status === 404) {
      throw new ApiError(404, ["El análisis ya no está disponible en el servidor. Vuelve a subir el archivo."]);
    }
    throw reason;
  }
  let blob: Blob;
  try {
    blob = await response.blob();
  } catch {
    throw new ApiError(response.status, [`${fallback}. ${statusMessage(0, "network")}`], {}, "network");
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "results.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Incident manager (/api/incidents). Values mirror nexova_shared.incidents
// (packages/shared), the API's single source of truth; visible labels come from
// CONTEXT-nexova-incident-manager.es.md. Allowed status changes are not copied
// here: every incident carries its `next_statuses` from the API.
// ---------------------------------------------------------------------------

export const INCIDENT_STATUSES = ["open", "in_progress", "resolved", "discarded"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_CATEGORIES = [
  "technical_failure",
  "process_error",
  "client_complaint",
  "candidate_issue",
  "staff_issue",
  "sla_breach",
  "data_quality",
  "other",
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_ORIGINS = ["customer", "branch", "internal"] as const;
export type IncidentOrigin = (typeof INCIDENT_ORIGINS)[number];

export const BRANCHES = ["central", "valencia_operations", "miami_office", "remote"] as const;
export type Branch = (typeof BRANCHES)[number];

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Abierta",
  in_progress: "En curso",
  resolved: "Resuelta",
  discarded: "Descartada",
};

export const INCIDENT_STATUS_DESCRIPTIONS: Record<IncidentStatus, string> = {
  open: "Incidencia registrada, sin responsable asignado aún",
  in_progress: "Asignada a un equipo o persona, en gestión activa",
  resolved: "Resuelta y confirmada por quien la reportó o por el responsable",
  discarded: "Registrada por error, duplicada o fuera de alcance",
};

/** Action shown on a row to move an incident to that status. */
export const STATUS_ACTION_LABELS: Record<IncidentStatus, string> = {
  open: "Reabrir",
  in_progress: "Pasar a en curso",
  resolved: "Marcar como resuelta",
  discarded: "Descartar",
};

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  technical_failure: "Fallo técnico",
  process_error: "Error de proceso",
  client_complaint: "Queja de cliente",
  candidate_issue: "Incidencia con candidato",
  staff_issue: "Incidencia de personal (RR. HH.)",
  sla_breach: "Incumplimiento de SLA",
  data_quality: "Calidad de datos",
  other: "Otra",
};

export const INCIDENT_CATEGORY_DESCRIPTIONS: Record<IncidentCategory, string> = {
  technical_failure: "Fallo de sistema o herramienta tecnológica (ATS, HubSpot, Zendesk, infraestructura)",
  process_error: "Error en un proceso operativo: selección, incorporación, formación, facturación",
  client_complaint: "Queja o reclamación de un cliente corporativo sobre el servicio prestado",
  candidate_issue: "Problema reportado por o relacionado con un candidato en proceso de selección",
  staff_issue: "Incidencia interna de RRHH: ausencia, conflicto, accidente, baja",
  sla_breach: "Incumplimiento de SLA comprometido con un cliente",
  data_quality: "Error o inconsistencia en datos de candidatos, clientes o reportes",
  other: "Cualquier incidencia que no encaje en las categorías anteriores",
};

export const INCIDENT_ORIGIN_LABELS: Record<IncidentOrigin, string> = {
  customer: "Cliente corporativo",
  branch: "Oficina de Nexova",
  internal: "Detección interna",
};

export const INCIDENT_ORIGIN_DESCRIPTIONS: Record<IncidentOrigin, string> = {
  customer: "Reportada por un cliente corporativo (empresa que contrata servicios de Nexova)",
  branch: "Reportada por personal de una de las oficinas de Nexova",
  internal: "Detectada internamente por tecnología, operaciones o dirección",
};

export const BRANCH_LABELS: Record<Branch, string> = {
  central: "Central — Sede Valencia",
  valencia_operations: "Valencia — Operaciones",
  miami_office: "Miami Office",
  remote: "Remoto (empleado sin sede fija)",
};

export type IncidentInput = {
  title: string;
  description: string;
  category: IncidentCategory;
  origin: IncidentOrigin;
  branch: Branch;
};

export type Incident = IncidentInput & {
  id: number;
  status: IncidentStatus;
  created_at: string;
  next_statuses: IncidentStatus[];
};

export type IncidentFilters = { status?: IncidentStatus | ""; origin?: IncidentOrigin | ""; branch?: Branch | "" };

export type IncidentTotals = {
  total: number;
  by_status: Record<IncidentStatus, number>;
  by_category: Record<IncidentCategory, number>;
  by_origin: Record<IncidentOrigin, number>;
  by_branch: Record<Branch, number>;
};

// Timeouts come from apiFetch (DEFAULT_TIMEOUT_MS).
function incidentRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  return apiJson<T>(`/api/incidents${path}`, options);
}

export function createIncident(input: IncidentInput): Promise<Incident> {
  return incidentRequest<Incident>("", { method: "POST", json: input });
}

export function listIncidents(filters: IncidentFilters = {}): Promise<Incident[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return incidentRequest<Incident[]>(query ? `?${query}` : "");
}

export function getIncidentTotals(): Promise<IncidentTotals> {
  return incidentRequest<IncidentTotals>("/summary");
}

export function updateIncidentStatus(id: number, status: IncidentStatus): Promise<Incident> {
  return incidentRequest<Incident>(`/${id}/status`, { method: "PATCH", json: { status } });
}

export function formatIncidentDate(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}
