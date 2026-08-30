// lib/telemetry-api.ts — Cliente de consulta de telemetría para el dashboard
//
// Propósito: Funciones para consultar los endpoints GET de telemetría
// (eventos y resumen agregado) desde el frontend del backoffice.
//
// Los endpoints se sirven a través del rewrite de Next.js:
//   /telemetry/events   ← proxy → http://localhost:8004/telemetry/events
//   /telemetry/summary  ← proxy → http://localhost:8004/telemetry/summary
//
// No requiere autenticación (la telemetría es write-only desde el frontend
// y de solo lectura para el dashboard).
//
// Uso:
//   import { fetchTelemetryEvents, fetchTelemetrySummary } from "@/lib/telemetry-api"
//   const summary = await fetchTelemetrySummary()

// ─────────────────────────────────────────────────────────────
// Tipos — Corresponden a los modelos Pydantic del backend
// ─────────────────────────────────────────────────────────────

export interface TelemetryEventRecord {
  id: string;
  timestamp: string;
  service: string;
  event_type: string;
  level: string;
  value: number | null;
  message: string | null;
  tags: Record<string, unknown>;
}

export interface TelemetryQueryResponse {
  events: TelemetryEventRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface TelemetrySummaryItem {
  label: string;
  count: number;
}

export interface TelemetrySummaryResponse {
  total_events: number;
  by_event_type: TelemetrySummaryItem[];
  by_service: TelemetrySummaryItem[];
  by_level: TelemetrySummaryItem[];
  by_day: TelemetrySummaryItem[];
  recent_events: TelemetryEventRecord[];
}

// ─────────────────────────────────────────────────────────────
// Funciones de consulta
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene eventos de telemetría con filtros opcionales.
 * GET /telemetry/events
 */
export async function fetchTelemetryEvents(params?: {
  event_type?: string;
  service?: string;
  level?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}): Promise<TelemetryQueryResponse> {
  const searchParams = new URLSearchParams();
  if (params?.event_type) searchParams.set("event_type", params.event_type);
  if (params?.service) searchParams.set("service", params.service);
  if (params?.level) searchParams.set("level", params.level);
  if (params?.from_date) searchParams.set("from_date", params.from_date);
  if (params?.to_date) searchParams.set("to_date", params.to_date);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const qs = searchParams.toString();
  const url = `/telemetry/events${qs ? `?${qs}` : ""}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Telemetry fetch failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Obtiene el resumen agregado de telemetría para el dashboard.
 * GET /telemetry/summary
 */
export async function fetchTelemetrySummary(): Promise<TelemetrySummaryResponse> {
  const response = await fetch("/telemetry/summary");
  if (!response.ok) {
    throw new Error(`Telemetry summary fetch failed: ${response.status}`);
  }
  return response.json();
}