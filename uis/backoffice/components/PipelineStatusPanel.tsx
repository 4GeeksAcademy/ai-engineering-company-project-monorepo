// components/PipelineStatusPanel.tsx — Panel de estado del pipeline ETL
//
// Muestra las estadísticas del pipeline ETL, historial de ejecuciones
// y KPIs semanales obtenidos desde la API.
//
// Uso:
//   <PipelineStatusPanel />
//
// Sigue el mismo patrón que SmokeChecksPanel.tsx.

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchPipelineStats,
  fetchLatestRuns,
  fetchKpis,
  type PipelineStats,
  type PipelineRun,
  type KpiRecord,
  formatDate,
  formatWarehouse,
  statusBadgeClass,
  statusLabel,
} from "@/lib/pipeline-actions";

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export function PipelineStatusPanel() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [kpis, setKpis] = useState<KpiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, runsData, kpisData] = await Promise.all([
        fetchPipelineStats(),
        fetchLatestRuns(10),
        fetchKpis(),
      ]);
      setStats(statsData);
      setRuns(runsData);
      setKpis(kpisData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos del pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Estado de carga ────────────────────────────
  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <span className="ml-3 text-slate-500">Cargando datos del pipeline...</span>
        </div>
      </section>
    );
  }

  // ── Estado de error ────────────────────────────
  if (error) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm md:p-8">
        <div className="rounded-xl bg-rose-50 p-4 text-rose-700">
          <p className="font-semibold">Error al conectar con la API</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={loadData}
            className="mt-3 rounded-lg bg-rose-100 px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-200"
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      {/* ── Encabezado ─────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Estado del pipeline ETL
          </h2>
          <p className="mt-1 text-slate-600">
            Monitoreo de ejecuciones del pipeline de telemetría a reporting.
          </p>
        </div>
        <button
          onClick={loadData}
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ↻ Recargar
        </button>
      </div>

      {/* ── Tarjetas de estadísticas ───────────── */}
      {stats && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <StatCard
            label="Ejecuciones totales"
            value={stats.total_runs}
            subtext={`${stats.completed_runs} completadas · ${stats.failed_runs} fallidas`}
          />
          <StatCard
            label="Tasa de éxito"
            value={`${stats.success_rate}%`}
            subtext={stats.last_run ? `Última: ${statusLabel(stats.last_run.status)}` : "Sin datos"}
            highlighted={stats.success_rate >= 80}
          />
          <StatCard
            label="Filas procesadas"
            value={stats.rows_read_total.toLocaleString()}
            subtext={`${stats.rows_upserted_total.toLocaleString()} upserted`}
          />
          <StatCard
            label="Semanas con KPIs"
            value={stats.weeks_with_kpis}
            subtext={stats.last_run ? `Última: ${stats.last_run.week_start}` : "—"}
          />
        </div>
      )}

      {/* ── Últimas ejecuciones ────────────────── */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-slate-900">
          Últimas ejecuciones
        </h3>
        {runs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No hay ejecuciones registradas.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 font-medium">Estado</th>
                  <th className="py-3 pr-4 font-medium">Inicio</th>
                  <th className="py-3 pr-4 font-medium">Fin</th>
                  <th className="py-3 pr-4 font-medium">Filas</th>
                  <th className="py-3 font-medium">Semana</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.run_id}
                    className="border-b border-slate-100 align-top hover:bg-slate-50"
                  >
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(run.status)}`}
                      >
                        {statusLabel(run.status)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {formatDate(run.started_at)}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {formatDate(run.finished_at)}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {run.rows_read} → {run.rows_upserted}
                    </td>
                    <td className="py-3 text-slate-700">{run.week_start}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── KPIs semanales ─────────────────────── */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-slate-900">
          KPIs semanales
        </h3>
        {kpis.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No hay KPIs calculados todavía. Ejecuta el pipeline para generar datos.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 font-medium">Almacén</th>
                  <th className="py-3 pr-4 font-medium">Cliente</th>
                  <th className="py-3 pr-4 font-medium">Semana</th>
                  <th className="py-3 pr-4 text-right font-medium">Inbound</th>
                  <th className="py-3 pr-4 text-right font-medium">Outbound</th>
                  <th className="py-3 pr-4 text-right font-medium">Stockouts</th>
                  <th className="py-3 pr-4 text-right font-medium">Discrep.</th>
                  <th className="py-3 text-right font-medium">Tasa error</th>
                </tr>
              </thead>
              <tbody>
                {kpis.slice(0, 15).map((kpi) => (
                  <tr
                    key={kpi.id}
                    className="border-b border-slate-100 align-top hover:bg-slate-50"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {formatWarehouse(kpi.warehouse)}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{kpi.client_id}</td>
                    <td className="py-3 pr-4 text-slate-700">{kpi.week_start}</td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {kpi.inbound_units_count}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {kpi.outbound_orders_count}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {kpi.stockout_events_count}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {kpi.discrepancy_events_count}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          kpi.discrepancy_rate > 0.5
                            ? "bg-rose-100 text-rose-700"
                            : kpi.discrepancy_rate > 0.2
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {(kpi.discrepancy_rate * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {kpis.length > 15 && (
              <p className="mt-2 text-xs text-slate-500">
                Mostrando 15 de {kpis.length} registros.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────── */}
      <p className="mt-6 text-xs text-slate-500">
        Los datos se obtienen de la API FastAPI en /pipeline/stats, /pipeline/latest-runs y /pipeline/kpis.
        Los KPIs son calculados por el pipeline ETL en data/pipelines/.
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// StatCard — Tarjeta de estadística simple
// ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subtext,
  highlighted,
}: {
  label: string;
  value: string | number;
  subtext: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlighted
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          highlighted ? "text-emerald-900" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{subtext}</p>
    </div>
  );
}