"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Download, Loader2 } from "lucide-react";
import CsvUploader from "../components/incidents/CsvUploader";
import { ErrorBanner } from "../components/ui/Field";
import LoadingState from "../components/ui/LoadingState";
import { analyzeIncidentsFile, downloadResultsCsv, ApiError } from "../lib/api";
import type { AnalyzeResponse } from "../types/incidents";

// The results panel is only drawn once a CSV has been analysed; before that (the page's whole first visit) it is dead code.
const MetricsSummary = dynamic(() => import("../components/incidents/MetricsSummary"), {
  loading: () => <LoadingState label="Preparando resultados…" />,
});

export default function IncidentsAnalysisPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setFileName(file.name);
    setError(null);
    setResult(null);
    setIsAnalyzing(true);
    try {
      const response = await analyzeIncidentsFile(file);
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo analizar el archivo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = async () => {
    setError(null);
    setIsExporting(true);
    try {
      await downloadResultsCsv();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo descargar el archivo.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold text-white">Análisis de incidentes</h1>
        <p className="mt-2 text-slate-400">
          Sube el CSV de tickets de soporte exportado del helpdesk para validar los registros y
          calcular las métricas del reporte.
        </p>
      </header>

      <div className="mt-8">
        <CsvUploader onFileSelected={handleFileSelected} disabled={isAnalyzing} />
        {fileName && (
          <p className="mt-3 text-sm text-slate-400">
            Archivo: <span className="text-slate-200">{fileName}</span>
          </p>
        )}
      </div>

      {isAnalyzing && (
        <LoadingState label="Analizando archivo..." className="mt-8" />
      )}

      {error && (
        <ErrorBanner message={error} className="mt-8" />
      )}

      {result && !isAnalyzing && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Resultados</h2>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Descargar CSV
            </button>
          </div>
          <div className="mt-6">
            <MetricsSummary result={result} />
          </div>
        </div>
      )}
    </div>
  );
}
