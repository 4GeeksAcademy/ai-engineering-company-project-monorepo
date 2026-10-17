// lib/incident-actions.ts — Acciones CRUD para el gestor de incidencias
//
// Funciones para interactuar con la API de incidencias (/api/incidents).
// Reutiliza los helpers apiGet, apiPost, apiPatch de api.ts.
//
// Uso:
//   import { createIncident, fetchIncidents, fetchIncidentById, updateIncidentStatus, fetchIncidentsSummary } from "@/lib/incident-actions"

import { apiGet, apiPost, apiPatch } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export interface Incident {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  origin: string;
  branch: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentSummary {
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
}

export type IncidentStatus = "open" | "in_progress" | "resolved" | "discarded";
// ─────────────────────────────────────────────────────────────

export const VALID_STATUSES: IncidentStatus[] = ["open", "in_progress", "resolved", "discarded"];
export const VALID_CATEGORIES = [
  "lost_parcel",
  "delivery_failure",
  "inventory_discrepancy",
  "carrier_issue",
  "returns_issue",
  "system_failure",
  "client_complaint",
  "other",
] as const;

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress", "discarded"],
  in_progress: ["resolved", "discarded"],
  resolved: [],
  discarded: [],
};

/**
 * Obtiene los siguientes estados válidos para una transición.
 */
export function getAllowedTransitions(currentStatus: string): string[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Crea una nueva incidencia.
 * POST /api/incidents
 */
export async function createIncident(data: {
  title: string;
  description: string;
  category: string;
  origin: string;
  branch: string;
}): Promise<Incident> {
  return apiPost<Incident>("/api/incidents/", data);
}

/**
 * Lista todas las incidencias con filtros opcionales.
 * GET /api/incidents
 */
export async function fetchIncidents(params?: {
  status?: string;
  category?: string;
  origin?: string;
  branch?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}): Promise<Incident[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.origin) searchParams.set("origin", params.origin);
  if (params?.branch) searchParams.set("branch", params.branch);
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params?.sort_order) searchParams.set("sort_order", params.sort_order);

  const query = searchParams.toString();
  return apiGet<Incident[]>(`/api/incidents/${query ? `?${query}` : ""}`);
}

/**
 * Obtiene una incidencia por su ID.
 * GET /api/incidents/{id}
 */
export async function fetchIncidentById(id: number): Promise<Incident> {
  return apiGet<Incident>(`/api/incidents/${id}`);
}

/**
 * Actualiza el estado de una incidencia.
 * PATCH /api/incidents/{id}/status
 */
export async function updateIncidentStatus(
  id: number,
  status: string
): Promise<Incident> {
  return apiPatch<Incident>(`/api/incidents/${id}/status`, { status });
}

/**
 * Obtiene el resumen estadístico de incidencias.
 * GET /api/incidents/summary
 */
export async function fetchIncidentsSummary(): Promise<IncidentSummary> {
  return apiGet<IncidentSummary>("/api/incidents/summary");
}