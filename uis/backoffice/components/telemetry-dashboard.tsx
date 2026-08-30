// components/telemetry-dashboard.tsx — Dashboard visual del Reporte Técnico de Telemetría
//
// Muestra métricas agregadas de telemetría obtenidas del endpoint /telemetry/summary.
// Incluye: tarjetas de resumen, gráficos de barras por tipo/servicio/nivel,
// historial por día y tabla de eventos recientes.
//
// Fase 4 — Reporte técnico de telemetría

"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchTelemetrySummary, fetchTelemetryEvents } from "@/lib/telemetry-api";
import type { TelemetrySummaryResponse, TelemetryEventRecord, TelemetryQueryResponse } from "@/lib/telemetry-api";

// ─────────────────────────────────────────────────────────────
// Constantes de UI
// ─────────────────────────────────────────────────────────────

const LEVEL_BADGES: Record<string, string> = {
  info: "bg-sky-100 text-sky-700 border-sky-200",
  warn: "bg-amber-100 text-amber-700 border-amber-200",
  error: "bg-rose-100 text-rose-700 border-rose-200",
};

const SERVICE_BADGES: Record<string, string> = {
  backoffice: "bg-violet-100 text-violet-700 border-violet-200",
  api: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const LEVEL_COLORS: Record<string, string> = {
  info: "bg-sky-500",
  warn: "bg-amber-500",
  error: "bg-rose-500",
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function maxCount(items: { count: number }[]): number {
  return Math.max(...items.map((i) => i.count), 1);
}

// ─────────────────────────────────────────────────────────────
// Componente de barra de progreso horizontal
// ─────────────────────────────────────────────────────────────

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = (count / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 truncate text-right text-xs font-medium text-slate-600" title={label}>
        {label}
      </span>
      <div className="flex-1 rounded-full bg-slate-100 h-5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-slate-800">{count}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────

export default function TelemetryDashboard() {
  const [summary, setSummary] = useState<TelemetrySummaryResponse | null>(null);
  const [events, setEvents] = useState<TelemetryEventRecord[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [filterService, setFilterService] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("");

  // Cargar resumen
  const loadSummary = useCallback(async () => {
    try {
      const data = await fetchTelemetrySummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load telemetry summary:", err);
    }
  }, []);

  // Cargar eventos con filtros
  const loadEvents = useCallback(async () => {
    try {
      const data: TelemetryQueryResponse = await fetchTelemetryEvents({
        event_type: filterType || undefined,
        service: filterService || undefined,
        level: filterLevel || undefined,
        limit: 20,
      });
      setEvents(data.events);
      setEventsTotal(data.total);
    } catch (err) {
      console.error("Failed to load telemetry events:", err);
    }
  }, [filterType, filterService, filterLevel]);

  // Carga inicial
  useEffect(() => {
    setLoading(true);
    Promise.all([loadSummary(), loadEvents()])
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar datos"))
      .finally(() => setLoading(false));
  }, [loadSummary, loadEvents]);

  // ─── Estados de carga ─────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-rose-700 font-medium">{error}</p>
        <button
          onClick={() => { setLoading(true); Promise.all([loadSummary(), loadEvents()]).finally(() => setLoading(false)); }}
          className="mt-3 rounded-lg bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ─── Sin datos ────────────────────────────────────────

  if (!summary || summary.total_events === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 p-4">
          <svg className="h-full w-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-700">No hay datos de telemetría</h2>
        <p className="mt-2 text-sm text-slate-500">
          Aún no se han capturado eventos de telemetría. Navega por el backoffice
          para generar eventos, estos se almacenarán automáticamente y aparecerán aquí.
        </p>
      </div>
    );
  }

  // ─── Dashboard ────────────────────────────────────────

  const maxType = maxCount(summary.by_event_type);
  const maxDay = maxCount(summary.by_day);

  return (
    <div className="space-y-8">
      {/* ── Tarjetas de resumen ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Eventos"
          value={summary.total_events.toLocaleString()}
          icon={<CountIcon />}
          color="indigo"
        />
        <SummaryCard
          title="Tipos distintos"
          value={String(summary.by_event_type.length)}
          icon={<TypeIcon />}
          color="emerald"
        />
        <SummaryCard
          title="Servicios"
          value={summary.by_service.map((s) => s.label).join(" + ")}
          icon={<ServiceIcon />}
          color="violet"
        />
        <SummaryCard
          title="Días con datos"
          value={String(summary.by_day.length)}
          icon={<CalendarIcon />}
          color="amber"
        />
      </div>

      {/* ── Gráficos ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Por tipo de evento */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Eventos por tipo
          </h3>
          <div className="space-y-2">
            {summary.by_event_type.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                count={item.count}
                max={maxType}
                color="bg-indigo-500"
              />
            ))}
          </div>
        </div>

        {/* Por nivel (info/warn/error) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Eventos por nivel de severidad
          </h3>
          <div className="space-y-2">
            {summary.by_level.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                count={item.count}
                max={maxCount(summary.by_level)}
                color={LEVEL_COLORS[item.label] || "bg-slate-500"}
              />
            ))}
          </div>
        </div>

        {/* Por servicio */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Eventos por servicio
          </h3>
          <div className="space-y-2">
            {summary.by_service.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                count={item.count}
                max={maxCount(summary.by_service)}
                color="bg-violet-500"
              />
            ))}
          </div>
        </div>

        {/* Por día (últimos 30 días) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Eventos por día (últimos 30)
          </h3>
          <div className="space-y-2">
            {summary.by_day.slice(0, 14).map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                count={item.count}
                max={maxDay}
                color="bg-cyan-500"
              />
            ))}
          </div>
          {summary.by_day.length > 14 && (
            <p className="mt-2 text-center text-xs text-slate-400">
              +{summary.by_day.length - 14} días más
            </p>
          )}
        </div>
      </div>

      {/* ── Filtros de eventos recientes ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Eventos recientes
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({eventsTotal} total)
            </span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
            >
              <option value="">Todos los tipos</option>
              {summary.by_event_type.map((t) => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
            >
              <option value="">Todos los servicios</option>
              {summary.by_service.map((s) => (
                <option key={s.label} value={s.label}>{s.label}</option>
              ))}
            </select>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
            >
              <option value="">Todos los niveles</option>
              {summary.by_level.map((l) => (
                <option key={l.label} value={l.label}>{l.label}</option>
              ))}
            </select>
            <button
              onClick={loadEvents}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Filtrar
            </button>
          </div>
        </div>

        {/* Tabla de eventos */}
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No se encontraron eventos con los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Timestamp</th>
                  <th className="pb-2 pr-4 font-medium">Tipo</th>
                  <th className="pb-2 pr-4 font-medium">Servicio</th>
                  <th className="pb-2 pr-4 font-medium">Nivel</th>
                  <th className="pb-2 font-medium">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">
                      {formatDate(evt.timestamp)}
                    </td>
                    <td className="py-2 pr-4">
                      <code className="text-xs text-slate-700">{evt.event_type}</code>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${SERVICE_BADGES[evt.service] || "bg-slate-100 text-slate-600"}`}>
                        {evt.service}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${LEVEL_BADGES[evt.level] || "bg-slate-100 text-slate-600"}`}>
                        {evt.level}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600 max-w-xs truncate">
                      {evt.message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    violet: "bg-violet-50 text-violet-600 border-violet-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
  };
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${colors[color] || colors.indigo}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="h-5 w-5">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">{title}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function CountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function TypeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function ServiceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}