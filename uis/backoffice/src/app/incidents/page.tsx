"use client";

import { useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import { IncidentSummary } from "@/components/IncidentSummary";
import { analyzeIncidents, downloadResultsCsv, type AnalysisResult } from "@/lib/incidentsApi";

export default function IncidentsPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function upload(file: File) {
    setError("");
    setLoading(true);
    try {
      setResult(await analyzeIncidents(file));
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function download() {
    setError("");
    setDownloading(true);
    try {
      await downloadResultsCsv();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main>
      <h1>Análisis de incidencias</h1>
      <p className="muted">
        Carga el CSV exportado del helpdesk para obtener el resumen de tickets. Los datos se procesan en el servidor
        interno de Nexova y nunca se muestran correos de clientes.
      </p>
      <FileDrop onFile={upload} disabled={loading} />
      <div aria-live="polite">
        {loading && <p>Analizando…</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      {result && (
        <>
          <IncidentSummary result={result} />
          <section className="card export">
            <div>
              <h2>Exportar resultados</h2>
              <p className="muted">Descarga <code>results.csv</code> con una métrica por fila.</p>
            </div>
            <button type="button" onClick={download} disabled={downloading}>
              {downloading ? "Descargando…" : "Descargar resultados CSV"}
            </button>
          </section>
        </>
      )}
    </main>
  );
}
