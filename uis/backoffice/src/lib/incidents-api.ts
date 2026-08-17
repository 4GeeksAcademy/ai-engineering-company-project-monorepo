/**
 * Incidents API client — Brasaland Centralized Incident Manager
 *
 * Extends the existing analysis API with CRUD operations for incidents.
 */

// ---------------------------------------------------------------------------
// Types (local copies to avoid circular deps with shared-types at build time)
// ---------------------------------------------------------------------------

export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'discarded';
export type IncidentCategory =
  | 'CUSTOMER_COMPLAINT'
  | 'EQUIPMENT'
  | 'SUPPLY'
  | 'FOOD_QUALITY'
  | 'STAFF';
export type IncidentBranch =
  | 'COL-01' | 'COL-02' | 'COL-03' | 'COL-04' | 'COL-05'
  | 'COL-06' | 'COL-07' | 'COL-08' | 'COL-09' | 'COL-10'
  | 'FLA-01' | 'FLA-02' | 'FLA-03' | 'FLA-04'
  | 'HQ-MDE';
export type IncidentOrigin = 'api' | 'csv_import' | 'manual';

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  branch: IncidentBranch;
  reported_at: string;
  updated_at: string;
  origin: IncidentOrigin;
  external_ref?: string | null;
}

export interface IncidentCreateRequest {
  title: string;
  description: string;
  category: IncidentCategory;
  branch: IncidentBranch;
}

export interface IncidentStatusUpdateRequest {
  status: IncidentStatus;
}

export interface IncidentSummaryByStatus {
  status: IncidentStatus;
  label: string;
  count: number;
}

export interface IncidentSummaryByCategory {
  category: IncidentCategory;
  label: string;
  count: number;
}

export interface IncidentSummaryByBranch {
  branch: IncidentBranch;
  label: string;
  count: number;
}

export interface IncidentSummaryByOrigin {
  origin: IncidentOrigin;
  label: string;
  count: number;
}

export interface IncidentSummary {
  total: number;
  by_status: IncidentSummaryByStatus[];
  by_category: IncidentSummaryByCategory[];
  by_branch: IncidentSummaryByBranch[];
  by_origin: IncidentSummaryByOrigin[];
}

export interface IncidentErrorResponse {
  code: number;
  message: string;
  field?: string | null;
  request_id: string;
}

// ---------------------------------------------------------------------------
// Analysis types (existing)
// ---------------------------------------------------------------------------

export type BreakdownItem = {
  code: string;
  label: string;
  count: number;
  percentage?: number | null;
};

export type IncidentAnalysisResponse = {
  source_file: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  invalid_breakdown: BreakdownItem[];
  category_breakdown: BreakdownItem[];
  status_breakdown: BreakdownItem[];
  satisfaction: {
    scored_closed_cases: number;
    total_closed_cases: number;
    average_score: number;
    score_breakdown: BreakdownItem[];
  };
};

// ---------------------------------------------------------------------------
// Constants / Labels
// ---------------------------------------------------------------------------

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
  discarded: 'Descartado',
};

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  CUSTOMER_COMPLAINT: 'Queja de cliente',
  EQUIPMENT: 'Equipo',
  SUPPLY: 'Suministro',
  FOOD_QUALITY: 'Calidad de alimentos',
  STAFF: 'Personal',
};

export const BRANCH_LABELS: Record<IncidentBranch, string> = {
  'COL-01': 'Bogotá Centro',
  'COL-02': 'Medellín Norte',
  'COL-03': 'Cali Sur',
  'COL-04': 'Barranquilla',
  'COL-05': 'Bucaramanga',
  'COL-06': 'Cartagena',
  'COL-07': 'Pereira',
  'COL-08': 'Santa Marta',
  'COL-09': 'Ibagué',
  'COL-10': 'Manizales',
  'FLA-01': 'Miami Beach',
  'FLA-02': 'Orlando Central',
  'FLA-03': 'Tampa Bay',
  'FLA-04': 'Fort Lauderdale',
  'HQ-MDE': 'Sede Central Medellín',
};

export const ORIGIN_LABELS: Record<IncidentOrigin, string> = {
  api: 'API',
  csv_import: 'Importación CSV',
  manual: 'Manual',
};

export const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['in_progress', 'discarded'],
  in_progress: ['resolved', 'discarded'],
  resolved: [],
  discarded: [],
};

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

const API_BASE_URL = (process.env.NEXT_PUBLIC_INCIDENTS_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('brasaland_token');
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada. Inicia sesión nuevamente.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const serverMessage = error.message || error.detail || '';
    const statusMessages: Record<number, string> = {
      400: 'La solicitud contiene datos inválidos.',
      403: 'No tienes permiso para realizar esta acción.',
      404: 'El recurso solicitado no fue encontrado.',
      409: 'El recurso ya existe.',
      422: 'Los datos enviados no pasaron la validación.',
      429: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
      500: 'Error interno del servidor. Intenta de nuevo más tarde.',
      502: 'El servicio no está disponible momentáneamente.',
      503: 'El servicio está en mantenimiento. Intenta más tarde.',
    };
    const userMessage = statusMessages[response.status] || `Error de comunicación (${response.status}).`;
    throw new Error(serverMessage || userMessage);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export async function listIncidents(filters?: {
  status?: string;
  category?: string;
  branch?: string;
}): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.branch) params.set('branch', filters.branch);

  const qs = params.toString();
  const url = `${API_BASE_URL}/api/incidents${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, { headers: getAuthHeaders() });
  return handleResponse<Incident[]>(response);
}

export async function getIncident(id: string): Promise<Incident> {
  const response = await fetch(`${API_BASE_URL}/api/incidents/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Incident>(response);
}

export async function createIncident(data: IncidentCreateRequest): Promise<Incident> {
  const response = await fetch(`${API_BASE_URL}/api/incidents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Incident>(response);
}

export async function updateIncidentStatus(
  id: string,
  data: IncidentStatusUpdateRequest,
): Promise<Incident> {
  const response = await fetch(`${API_BASE_URL}/api/incidents/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Incident>(response);
}

export async function getIncidentsSummary(): Promise<IncidentSummary> {
  const response = await fetch(`${API_BASE_URL}/api/incidents/summary`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<IncidentSummary>(response);
}

// ---------------------------------------------------------------------------
// Analysis (existing)
// ---------------------------------------------------------------------------

export async function analyzeIncidentsFile(file: File): Promise<IncidentAnalysisResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/incidents/analyze`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const fallbackMessage = `No se pudo analizar el archivo (${response.status}).`;
    if (response.headers.get('content-type')?.includes('application/json')) {
      const payload = (await response.json()) as { detail?: string };
      throw new Error(payload.detail || fallbackMessage);
    }
    throw new Error(fallbackMessage);
  }

  return (await response.json()) as IncidentAnalysisResponse;
}

export function getIncidentsExportUrl(): string {
  return `${API_BASE_URL}/api/incidents/results/export`;
}