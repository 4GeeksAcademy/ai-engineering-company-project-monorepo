"use client";

export interface IncidentsAnalysisResult {
  total_records: number;
  valid_records: number;
  invalid_records: number;
  primary_invalid_breakdown: {
    invalid_tracking: number;
    carrier_country_mismatch: number;
    invalid_category: number;
    invalid_email: number;
    closed_no_score: number;
  };
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  by_country: Record<string, number>;
  satisfaction: {
    scored_incidents: number;
    total_closed: number;
    average: number;
    distribution: Record<string, number>;
  };
  percentages: {
    category: Record<string, number>;
    status: Record<string, number>;
    country: Record<string, number>;
  };
}

interface ResultsSummaryProps {
  result: IncidentsAnalysisResult;
}

const categoryOrder = [
  "LOST_PARCEL",
  "DELAYED_DELIVERY",
  "WRONG_ADDRESS",
  "RETURN_REQUEST",
  "DAMAGE",
];

const statusOrder = ["OPEN", "CLOSED", "DISCARDED"];
const countryOrder = ["US", "ES"];

function renderRows(items: string[], counts: Record<string, number>, percents: Record<string, number>) {
  return items.map((key) => (
    <tr key={key} className="border-b border-slate-100">
      <td className="px-4 py-3 font-medium text-slate-800">{key}</td>
      <td className="px-4 py-3 text-slate-700">{counts[key] ?? 0}</td>
      <td className="px-4 py-3 text-slate-700">{(percents[key] ?? 0).toFixed(1)}%</td>
    </tr>
  ));
}

export function ResultsSummary({ result }: ResultsSummaryProps) {
  const invalidEntries = [
    ["Tracking invalido", result.primary_invalid_breakdown.invalid_tracking],
    ["Carrier/pais mismatch", result.primary_invalid_breakdown.carrier_country_mismatch],
    ["Categoria invalida", result.primary_invalid_breakdown.invalid_category],
    ["Email invalido", result.primary_invalid_breakdown.invalid_email],
    ["Closed sin score", result.primary_invalid_breakdown.closed_no_score],
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-bold text-slate-900">Resultados del analisis</h2>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-800">Total registros</p>
          <p className="mt-1 text-3xl font-bold text-indigo-950">{result.total_records}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Validos</p>
          <p className="mt-1 text-3xl font-bold text-emerald-900">{result.valid_records}</p>
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-800">Invalidos</p>
          <p className="mt-1 text-3xl font-bold text-rose-900">{result.invalid_records}</p>
        </article>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Categoria</th>
                <th className="px-4 py-3 font-semibold">Cantidad</th>
                <th className="px-4 py-3 font-semibold">Porcentaje</th>
              </tr>
            </thead>
            <tbody>{renderRows(categoryOrder, result.by_category, result.percentages.category)}</tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Cantidad</th>
                <th className="px-4 py-3 font-semibold">Porcentaje</th>
              </tr>
            </thead>
            <tbody>{renderRows(statusOrder, result.by_status, result.percentages.status)}</tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Pais</th>
                <th className="px-4 py-3 font-semibold">Cantidad</th>
                <th className="px-4 py-3 font-semibold">Porcentaje</th>
              </tr>
            </thead>
            <tbody>{renderRows(countryOrder, result.by_country, result.percentages.country)}</tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-lg font-bold text-slate-900">Satisfaccion (incidentes cerrados)</h3>
          <p className="mt-1 text-sm text-slate-600">
            Scored incidents: {result.satisfaction.scored_incidents} of {result.satisfaction.total_closed}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Average score: {result.satisfaction.average.toFixed(2)} / 5.00
          </p>

          <div className="mt-4 space-y-3">
            {Object.entries(result.satisfaction.distribution).map(([score, count]) => {
              const max = Math.max(...Object.values(result.satisfaction.distribution), 1);
              const widthPct = (count / max) * 100;

              return (
                <div key={score}>
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                    <span>Score {score}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-lg font-bold text-amber-900">Registros invalidos por regla</h3>
        <ul className="mt-3 grid gap-2 text-sm text-amber-950 sm:grid-cols-2">
          {invalidEntries.map(([label, value]) => (
            <li key={label as string} className="rounded-lg border border-amber-200 bg-white px-3 py-2">
              <span className="font-semibold">{label}:</span> {value}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
