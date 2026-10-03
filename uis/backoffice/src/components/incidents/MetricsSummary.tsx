import { AnalyzeResponse, INVALID_RULE_LABELS } from "../../types/incidents";
import { BreakdownBar, StatCard } from "./stats";

interface MetricsSummaryProps {
  result: AnalyzeResponse;
}

export default function MetricsSummary({ result }: MetricsSummaryProps) {
  const invalidRuleEntries = (
    Object.entries(result.invalid_breakdown) as [keyof typeof result.invalid_breakdown, number][]
  ).filter(([, count]) => count > 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total de registros" value={result.total_records} tone="default" />
        <StatCard label="Válidos" value={result.valid_records} tone="good" />
        <StatCard label="Inválidos" value={result.invalid_records} tone={result.invalid_records > 0 ? "bad" : "default"} />
        <StatCard
          label="Satisfacción media"
          value={result.satisfaction.average !== null ? result.satisfaction.average.toFixed(2) : "n/a"}
          tone="default"
        />
      </div>

      {invalidRuleEntries.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white">Registros inválidos por tipo</h3>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {invalidRuleEntries.map(([rule, count]) => (
              <li
                key={rule}
                className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm"
              >
                <span className="text-slate-200">{INVALID_RULE_LABELS[rule]}</span>
                <span className="font-semibold text-rose-300">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-lg font-semibold text-white">Por categoría (registros válidos)</h3>
        <div className="mt-3 space-y-3">
          {Object.entries(result.category_counts).map(([category, count]) => (
            <BreakdownBar
              key={category}
              label={category}
              count={count}
              percentage={result.category_percentages[category]}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white">Por estado (registros válidos)</h3>
        <div className="mt-3 space-y-3">
          {Object.entries(result.status_counts).map(([status, count]) => (
            <BreakdownBar
              key={status}
              label={status}
              count={count}
              percentage={result.status_percentages[status]}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white">
          Índice de satisfacción ({result.satisfaction.scored} de {result.satisfaction.closed} tickets cerrados)
        </h3>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Object.entries(result.satisfaction.distribution).map(([score, count]) => (
            <div key={score} className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
              <p className="text-xs text-slate-400">Score {score}</p>
              <p className="mt-1 text-xl font-bold text-white">{count}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
