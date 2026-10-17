// lib/pipeline-actions.ts — Acciones para el dashboard del pipeline ETL
//
// Funciones para obtener datos del pipeline desde la API.
// Reutiliza el helper apiGet de api.ts siguiendo el patrón de incident-actions.ts.
//
// Uso:
//   import { fetchPipelineStats, fetchLatestRuns, fetchKpis } from "@/lib/pipeline-actions"

import { apiGet } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export interface PipelineRun {
  run_id: string;
  pipeline_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_read: number;
  rows_upserted: number;
  error_message: string | null;
  triggered_by: string;
  week_start: string;
}

export interface PipelineStats {
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  success_rate: number;
  last_run: PipelineRun | null;
  rows_read_total: number;
  rows_upserted_total: number;
  weeks_with_kpis: number;
}

export interface KpiRecord {
  id: string;
  warehouse: string;
  client_id: string;
  week_start: string;
  inbound_units_count: number;
  outbound_orders_count: number;
  stockout_events_count: number;
  discrepancy_events_count: number;
  discrepancy_rate: number;
  computed_at: string;
}

// ─────────────────────────────────────────────────────────────
// Acciones
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene las estadísticas resumidas del pipeline.
 *
 * GET /pipeline/stats → { total_runs, completed_runs, failed_runs, ... }
 */
export async function fetchPipelineStats(): Promise<PipelineStats> {
  return apiGet<PipelineStats>("/pipeline/stats");
}

/**
 * Obtiene las últimas N ejecuciones del pipeline.
 *
 * GET /pipeline/latest-runs?limit=N → PipelineRun[]
 *
 * @param limit - Número de ejecuciones (1-100, default 10)
 */
export async function fetchLatestRuns(limit: number = 10): Promise<PipelineRun[]> {
  return apiGet<PipelineRun[]>(`/pipeline/latest-runs?limit=${limit}`);
}

/**
 * Obtiene los KPIs semanales, opcionalmente filtrados por semana.
 *
 * GET /pipeline/kpis?week_start=YYYY-MM-DD → KpiRecord[]
 *
 * @param weekStart - Semana en formato YYYY-MM-DD (opcional)
 */
export async function fetchKpis(weekStart?: string): Promise<KpiRecord[]> {
  const query = weekStart ? `?week_start=${weekStart}` : "";
  return apiGet<KpiRecord[]>(`/pipeline/kpis${query}`);
}

/**
 * Obtiene todas las ejecuciones del pipeline.
 *
 * GET /pipeline/runs → PipelineRun[]
 */
export async function fetchAllRuns(): Promise<PipelineRun[]> {
  return apiGet<PipelineRun[]>("/pipeline/runs");
}

// ─────────────────────────────────────────────────────────────
// Helpers de formato
// ─────────────────────────────────────────────────────────────

/**
 * Formatea un timestamp ISO a fecha legible en español.
 */
export function formatDate(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Formatea un nombre de almacén para mostrar.
 */
export function formatWarehouse(warehouse: string): string {
  return warehouse
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Formatea un porcentaje con un decimal.
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Devuelve la clase CSS para el badge de estado del pipeline.
 */
export function statusBadgeClass(status: string): string {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-800";
    case "Failed":
      return "bg-rose-100 text-rose-700";
    case "Running":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

/**
 * Devuelve la etiqueta en español para el estado.
 */
export function statusLabel(status: string): string {
  switch (status) {
    case "Completed":
      return "Completado";
    case "Failed":
      return "Fallido";
    case "Running":
      return "En ejecución";
    default:
      return status;
  }
}