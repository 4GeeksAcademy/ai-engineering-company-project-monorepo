"use client";

import { useMemo, useRef, useState } from "react";

type Summary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  invalidReasons: Record<string, number>;
  averageSatisfaction: number | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_INCIDENTS_API_BASE_URL ?? "http://localhost:3001";

function formatPercent(value: number, total: number): string {
  if (total === 0) {
    return "0%";
  }

  return `${((value / total) * 100).toFixed(1)}%`;
}

function getExportFilename(disposition: string | null): string {
  if (!disposition) {
    return "incidents-results.csv";
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return "incidents-results.csv";
}

export function IncidentsAnalysisPanel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const invalidReasonItems = useMemo(
    () => Object.entries(summary?.invalidReasons ?? {}).sort((a, b) => b[1] - a[1]),
    [summary]
  );

  const categoryItems = useMemo(
    () => Object.entries(summary?.categoryCounts ?? {}).sort((a, b) => b[1] - a[1]),
    [summary]
  );

  const statusItems = useMemo(
    () => Object.entries(summary?.statusCounts ?? {}).sort((a, b) => b[1] - a[1]),
    [summary]
  );

  const onFileSelected = (file: File | null) => {
    setError(null);
    setSummary(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
    if (!isCsv) {
      setSelectedFile(null);
      setError("Solo se permiten archivos CSV.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Selecciona un archivo CSV antes de analizar.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/incidents/analyze`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { error?: string; summary?: Summary };

      if (!response.ok || !payload.summary) {
        throw new Error(payload.error ?? "No se pudo analizar el archivo.");
      }

      setSummary(payload.summary);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Error inesperado al analizar el CSV.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/incidents/results/export`, {
        method: "GET",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "No se pudo exportar el resultado.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition");
      const fileName = getExportFilename(disposition);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "No se pudo descargar el archivo CSV.";
      setError(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Operaciones</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Análisis de incidencias</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Carga un CSV para obtener métricas generales, desglose por categoría/estado y detalle de registros
            inválidos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? "Descargando..." : "Descargar resultados CSV"}
        </button>
      </div>

      <div className="mt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
        />

        <div
          role="button"
          tabIndex={0}
          aria-label="Subir archivo CSV"
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            onFileSelected(event.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={
            isDragging
              ? "rounded-xl border-2 border-cyan-500 bg-cyan-50 p-8 text-center"
              : "rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center"
          }
        >
          <p className="text-sm font-medium text-slate-800">Arrastra y suelta tu archivo CSV aquí</p>
          <p className="mt-1 text-xs text-slate-500">o haz click para seleccionarlo desde tu equipo</p>
          {selectedFile ? (
            <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              Archivo seleccionado: {selectedFile.name}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Analizando..." : "Analizar archivo"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setSummary(null);
              setError(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Limpiar
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {summary ? (
        <div className="mt-8 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total filas</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalRows}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Registros válidos</p>
              <p className="mt-2 text-2xl font-bold text-emerald-900">{summary.validRows}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs uppercase tracking-wide text-rose-700">Registros inválidos</p>
              <p className="mt-2 text-2xl font-bold text-rose-900">{summary.invalidRows}</p>
            </div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-700">Satisfacción promedio</p>
              <p className="mt-2 text-2xl font-bold text-cyan-900">
                {summary.averageSatisfaction === null ? "N/A" : `${summary.averageSatisfaction.toFixed(2)} / 5`}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Desglose por categoria</h2>
              {categoryItems.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Sin categorías válidas para mostrar.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {categoryItems.map(([category, count]) => (
                    <li key={category} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                      <span className="font-medium text-slate-800">{category}</span>
                      <span className="text-slate-600">
                        {count} ({formatPercent(count, summary.validRows)})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="rounded-xl border border-slate-200 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Desglose por estado</h2>
              {statusItems.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Sin estados válidos para mostrar.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {statusItems.map(([status, count]) => (
                    <li key={status} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                      <span className="font-medium capitalize text-slate-800">{status}</span>
                      <span className="text-slate-600">
                        {count} ({formatPercent(count, summary.validRows)})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>

          <article className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Registros inválidos detectados
            </h2>
            {invalidReasonItems.length === 0 ? (
              <p className="mt-3 text-sm text-emerald-700">No se detectaron registros inválidos.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {invalidReasonItems.map(([reason, count]) => (
                  <li key={reason} className="flex items-center justify-between rounded-md bg-rose-50 px-3 py-2">
                    <span className="text-rose-900">{reason}</span>
                    <span className="font-semibold text-rose-700">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      ) : null}
    </section>
  );
}
