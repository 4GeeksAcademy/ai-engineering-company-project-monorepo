import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import CsvUploader from "../components/incidents/CsvUploader";
import MetricsSummary from "../components/incidents/MetricsSummary";
import { analyzeIncidentsFile, downloadResultsCsv, ApiError } from "../lib/api";
import type { AnalyzeResponse } from "../types/incidents";

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
        <div className="mt-8 flex items-center gap-3 text-slate-300">
          <Loader2 className="animate-spin" size={20} />
          Analizando archivo...
        </div>
      )}

      {error && (
        <div role="alert" className="mt-8 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
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
