"use client";

import { useEffect, useState } from "react";

import { Spinner } from "../ui/Spinner";
import { IncidentSummary, getIncidentsSummary } from "../../../services/incidentsApi";

interface IncidentsSummaryPanelProps {
  refreshToken: number;
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  );
}

export function IncidentsSummaryPanel({ refreshToken }: IncidentsSummaryPanelProps) {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getIncidentsSummary();
        setSummary(data);
      } catch {
        setError("Datos no disponibles");
      } finally {
        setIsLoading(false);
      }
    };

    void loadSummary();
  }, [refreshToken]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Metricas</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Resumen de incidencias</h2>
      </header>

      {isLoading ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6">
          <Spinner size="md" label="Cargando métricas" />
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-medium text-amber-800">{error}</p>
          <p className="mt-1 text-xs text-amber-700">Esta sección es independiente. El formulario y el listado siguen operativos.</p>
        </div>
      ) : null}

      {!isLoading && !error && summary ? (
        <div className="mt-5 space-y-6">
          <SummaryCard title="Total de incidencias" value={summary.total} />

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">Por estado</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(summary.by_status).map(([key, value]) => (
                <SummaryCard key={key} title={key} value={value} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">Por categoría</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(summary.by_category).map(([key, value]) => (
                <SummaryCard key={key} title={key} value={value} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">Por origen</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(summary.by_origin).map(([key, value]) => (
                <SummaryCard key={key} title={key} value={value} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">Por sede</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {Object.entries(summary.by_branch).map(([key, value]) => (
                <SummaryCard key={key} title={key} value={value} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
