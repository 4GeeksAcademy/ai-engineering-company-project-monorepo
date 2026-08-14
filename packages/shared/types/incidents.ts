/**
 * Incident types for Brasaland monorepo
 *
 * Matches the backend API response schema.
 */

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

// Display labels (match backend constants)
export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  CUSTOMER_COMPLAINT: 'Queja de cliente',
  EQUIPMENT: 'Falla de equipamiento',
  SUPPLY: 'Problema de abastecimiento',
  FOOD_QUALITY: 'Calidad de alimentos',
  STAFF: 'Incidente de personal',
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
  discarded: 'Descartado',
};

export const BRANCH_LABELS: Record<IncidentBranch, string> = {
  'COL-01': 'Brasaland Medellín Centro',
  'COL-02': 'Brasaland El Poblado',
  'COL-03': 'Brasaland Laureles',
  'COL-04': 'Brasaland Envigado',
  'COL-05': 'Brasaland Bucaramanga',
  'COL-06': 'Brasaland Bogotá Norte',
  'COL-07': 'Brasaland Bogotá Chapinero',
  'COL-08': 'Brasaland Cali Granada',
  'COL-09': 'Brasaland Barranquilla',
  'COL-10': 'Brasaland Cartagena',
  'FLA-01': 'Brasaland Brickell',
  'FLA-02': 'Brasaland Wynwood',
  'FLA-03': 'Brasaland Doral',
  'FLA-04': 'Brasaland Orlando',
  'HQ-MDE': 'Sede Central Medellín',
};

export const ORIGIN_LABELS: Record<IncidentOrigin, string> = {
  api: 'API',
  csv_import: 'Importación CSV',
  manual: 'Manual',
};

/** Allowed status transitions (state machine) */
export const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['in_progress', 'discarded'],
  in_progress: ['resolved', 'discarded'],
  resolved: [],
  discarded: [],
};
