import {
  BRANCH_LABELS,
  CATEGORY_LABELS,
  INCIDENT_BRANCHES,
  INCIDENT_CATEGORIES,
  INCIDENT_ORIGINS,
  ORIGIN_LABELS,
  type IncidentSummary,
} from "@repo/shared-types";
import { BreakdownBar, StatCard } from "./stats";

export default function IncidentSummaryPanel({ summary }: { summary: IncidentSummary }) {
  const average = summary.satisfaction_average;
  const counts = summary.status_counts;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard label="Total" value={summary.total} />
        <StatCard label="Abiertas" value={counts.open} tone={counts.open > 0 ? "warn" : "default"} />
        <StatCard label="En curso" value={counts.in_progress} />
        <StatCard label="Resueltas" value={counts.resolved} tone="good" />
        <StatCard label="Descartadas" value={counts.discarded} />
        <StatCard label="Satisfacción media" value={average !== null ? `${average.toFixed(2)} / 5` : "—"} />
      </div>

      {summary.total === 0 ? (
        <p className="text-sm text-slate-500">Sin datos para estos filtros.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold text-white">Por categoría</h3>
            <div className="mt-4 space-y-3">
              {INCIDENT_CATEGORIES.map((c) => (
                <BreakdownBar
                  key={c}
                  label={`${CATEGORY_LABELS[c]}${summary.active_by_category[c] ? ` · ${summary.active_by_category[c]} activas` : ""}`}
                  count={summary.category_counts[c]}
                  percentage={summary.category_percentages[c]}
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold text-white">Por origen</h3>
            <div className="mt-4 space-y-3">
              {INCIDENT_ORIGINS.map((o) => (
                <BreakdownBar
                  key={o}
                  label={ORIGIN_LABELS[o]}
                  count={summary.origin_counts[o]}
                  percentage={summary.total ? Math.round((summary.origin_counts[o] / summary.total) * 1000) / 10 : 0}
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold text-white">Por oficina</h3>
            <div className="mt-4 space-y-3">
              {INCIDENT_BRANCHES.map((branch) => (
                <BreakdownBar key={branch} label={BRANCH_LABELS[branch]} count={summary.branch_counts[branch]} percentage={summary.branch_percentages[branch]} />
              ))}
            </div>
          </div>
          <RankCard title="Clientes con más incidencias" items={summary.top_clients} empty="Ninguna incidencia indica cliente." />
        </div>
      )}
    </div>
  );
}

function RankCard({ title, items, empty }: { title: string; items: { name: string; count: number }[]; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="font-semibold text-white">{title}</h3>
      {items.length === 0 && empty && <p className="mt-4 text-sm text-slate-500">{empty}</p>}
      <ol className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.name}>
            <div className="flex justify-between text-sm">
              <span className="truncate pr-2 text-slate-200">{item.name}</span>
              <span className="text-slate-400">{item.count}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-cyan-400" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
