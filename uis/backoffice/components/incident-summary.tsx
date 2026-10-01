// components/incident-summary.tsx — Resumen estadístico de incidencias
//
// Muestra métricas agregadas: por estado, por categoría, por origen y por sede.
// Los datos provienen de GET /api/incidents/summary.

"use client";

import { useEffect, useState } from "react";
import { fetchIncidentsSummary } from "@/lib/incident-actions";
import type { IncidentSummary } from "@/lib/incident-actions";

const STATUS_LABELS: Record<string, string> = {
  open: "Abiertas",
  in_progress: "En progreso",
  resolved: "Resueltas",
  discarded: "Descartadas",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  discarded: "bg-slate-100 text-slate-600 border-slate-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  lost_parcel: "Paquete perdido",
  delivery_failure: "Fallo de entrega",
  inventory_discrepancy: "Discrepancia inventario",
  carrier_issue: "Problema transportista",
  returns_issue: "Problema devolución",
  system_failure: "Fallo del sistema",
  client_complaint: "Queja del cliente",
  other: "Otro",
};

const ORIGIN_LABELS: Record<string, string> = {
  customer: "Cliente",
  branch: "Sede",
  internal: "Interno",
};

const BRANCH_LABELS: Record<string, string> = {
  central: "Central",
  la_warehouse: "LA Warehouse",
  la_office: "LA Office",
  zaragoza_warehouse: "Zaragoza Warehouse",
  zaragoza_office: "Zaragoza Office",
};

type BarItem = { label: string; value: number; color: string };

const CHART_COLORS = [
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-slate-500",
  "bg-orange-500",
];

function BarChart({ items, title }: { items: BarItem[]; title: string }) {
  const maxVal = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <div key={item.label}>
            <div className="mb-0.5 flex justify-between text-sm">
              <span className="text-slate-700">{item.label}</span>
              <span className="font-medium text-slate-900">{item.value}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.color || CHART_COLORS[idx % CHART_COLORS.length]}`}
                style={{ width: `${(item.value / maxVal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${color ?? "border-slate-200 bg-white"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function IncidentSummary() {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchIncidentsSummary();
        setSummary(data);
      } catch (err: any) {
        setError(err?.detail?.detail ?? err?.detail ?? err?.message ?? "Error al cargar resumen");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">Cargando resumen...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
        No hay datos de resumen disponibles.
      </div>
    );
  }

  const total = Object.values(summary.by_status).reduce((a, b) => a + b, 0);

  // Preparar datos para gráficos
  const statusBars: BarItem[] = Object.entries(summary.by_status).map(([k, v]) => ({
    label: STATUS_LABELS[k] ?? k,
    value: v,
    color: STATUS_COLORS[k]?.split(" ")[0] ?? "bg-slate-500",
  }));

  const categoryBars: BarItem[] = Object.entries(summary.by_category).map(([k, v]) => ({
    label: CATEGORY_LABELS[k] ?? k.replace(/_/g, " "),
    value: v,
    color: CHART_COLORS[Object.keys(summary.by_category).indexOf(k) % CHART_COLORS.length],
  }));

  const originBars: BarItem[] = Object.entries(summary.by_origin).map(([k, v]) => ({
    label: ORIGIN_LABELS[k] ?? k,
    value: v,
    color: CHART_COLORS[Object.keys(summary.by_origin).indexOf(k) % CHART_COLORS.length],
  }));

  const branchBars: BarItem[] = Object.entries(summary.by_branch).map(([k, v]) => ({
    label: BRANCH_LABELS[k] ?? k.replace(/_/g, " "),
    value: v,
    color: CHART_COLORS[Object.keys(summary.by_branch).indexOf(k) % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Total */}
      <MetricCard label="Total incidencias" value={total} color="border-indigo-200 bg-indigo-50" />

      {/* Tarjetas por estado */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusBars.map((s) => (
          <MetricCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <BarChart items={statusBars} title="Por estado" />
        <BarChart items={categoryBars} title="Por categoría" />
        <BarChart items={originBars} title="Por origen" />
        <BarChart items={branchBars} title="Por sede" />
      </div>
    </div>
  );
}