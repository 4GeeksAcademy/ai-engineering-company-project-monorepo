"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import { getUserMessage, SUPPORT_EMAIL } from "@/lib/errors";
import { analyzeIncidents, downloadResultsCsv, type AnalysisResult } from "@/lib/incidentsApi";

// Rendered only after a CSV has been analysed, so it stays out of the initial bundle of /incidents.
// ssr:false: the summary never exists on first paint (there is no result yet), so the server has nothing to render.
const IncidentSummary = dynamic(() => import("@/components/IncidentSummary").then((module) => module.IncidentSummary), {
  ssr: false,
  loading: () => <p className="state muted"><span className="spinner" aria-hidden="true" />Preparando el resumen…</p>,
});

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
      setError(getUserMessage(reason));
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
      setError(getUserMessage(reason));
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
        {loading && <p className="state muted"><span className="spinner" aria-hidden="true" />Analizando…</p>}
        {error && (
          <div className="notice" role="alert">
            <p>
              {error} Puedes volver a seleccionar el archivo arriba. Si el problema continúa, escríbenos a{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </div>
        )}
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
