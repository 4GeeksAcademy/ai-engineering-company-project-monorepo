"use client";

import { useState } from "react";
import { ExportButton } from "./components/ExportButton";
import { FileUploader } from "./components/FileUploader";
import { IncidentsAnalysisResult, ResultsSummary } from "./components/ResultsSummary";

export default function IncidentsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IncidentsAnalysisResult | null>(null);

  const analyzeFile = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/incidents/analyze", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "Error al analizar el archivo.");
      }

      const payload = (await response.json()) as IncidentsAnalysisResult;
      setResult(payload);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <section className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-8 shadow-sm md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
              Postventa y calidad
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
              Analizador de incidencias TrackFlow
            </h1>
            <p className="mt-2 max-w-3xl text-slate-700">
              Sube un archivo CSV, audita la calidad de datos y consulta metricas operativas en segundos.
            </p>
          </div>
          <ExportButton disabled={!result} />
        </div>
      </section>

      <div className="mt-8 space-y-6">
        <FileUploader loading={loading} onAnalyze={analyzeFile} />

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</div>
        )}

        {result && <ResultsSummary result={result} />}
      </div>
    </main>
  );
}
