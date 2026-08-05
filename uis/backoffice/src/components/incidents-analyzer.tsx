"use client";

import { ChangeEvent, DragEvent, useId, useState, useTransition } from "react";

import { analyzeIncidentsFile, getIncidentsExportUrl, type IncidentAnalysisResponse } from "@/lib/incidents-api";

function percentageLabel(value?: number | null) {
  return value === undefined || value === null ? null : `${value.toFixed(1)}%`;
}

export function IncidentsAnalyzer() {
  const inputId = useId();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<IncidentAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onFileSelected(file: File | null) {
    setSelectedFile(file);
    setErrorMessage(null);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onFileSelected(event.target.files?.[0] ?? null);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    onFileSelected(file);
  }

  async function handleAnalyze() {
    if (!selectedFile) {
      setErrorMessage("Selecciona un archivo CSV antes de analizar.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = await analyzeIncidentsFile(selectedFile);
      startTransition(() => {
        setAnalysis(payload);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar el analisis.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDownload() {
    const link = document.createElement("a");
    link.href = getIncidentsExportUrl();
    link.download = "results.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const busy = isSubmitting || isPending;

  return (
    <div className="incidents-layout">
      <section className="card incidents-hero">
        <div>
          <p className="eyebrow">Analisis operativo interno</p>
          <h2>Sube el CSV de incidencias y obtén el resumen validado al instante</h2>
          <p className="muted incidents-copy">
            El archivo se procesa internamente contra las reglas exactas del contexto de Brasaland: campos esperados, categorias validas, estados permitidos y control de registros incompletos.
          </p>
        </div>

        <div className="hero-metrics">
          <div>
            <span>Campos auditados</span>
            <strong>9</strong>
          </div>
          <div>
            <span>Estados permitidos</span>
            <strong>3</strong>
          </div>
          <div>
            <span>Categorias validas</span>
            <strong>5</strong>
          </div>
        </div>
      </section>

      <section className="card upload-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Carga de archivo</p>
            <h3>Selecciona o arrastra un CSV</h3>
          </div>
          <span className="chip chip-ok">POST /api/incidents/analyze</span>
        </div>

        <label
          className={isDragging ? "upload-zone upload-zone-active" : "upload-zone"}
          htmlFor={inputId}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input accept=".csv,text/csv" className="sr-only" id={inputId} onChange={handleInputChange} type="file" />
          <span className="upload-title">Arrastra el archivo aquí o selecciónalo desde tu equipo</span>
          <span className="muted">Se acepta CSV UTF-8 con encabezados de Brasaland.</span>
          <strong>{selectedFile ? selectedFile.name : "Ningun archivo seleccionado"}</strong>
        </label>

        <div className="actions-row">
          <button className="primary-button" disabled={busy} onClick={handleAnalyze} type="button">
            {busy ? "Analizando..." : "Analizar incidencias"}
          </button>
          <button className="secondary-button" disabled={!analysis || busy} onClick={handleDownload} type="button">
            Descargar CSV
          </button>
        </div>

        {errorMessage ? <p className="feedback feedback-error">{errorMessage}</p> : null}
        {!errorMessage && analysis ? (
          <p className="feedback feedback-ok">
            Analisis disponible para {analysis.source_file}. Registros invalidos detectados: {analysis.invalid_records}.
          </p>
        ) : null}
      </section>

      {analysis ? (
        <>
          <section className="kpi-grid incidents-kpis">
            <article className="card">
              <h3>Total procesado</h3>
              <p className="kpi-number">{analysis.total_records}</p>
              <p className="kpi-sub">Incluye validos e invalidos</p>
            </article>
            <article className="card">
              <h3>Registros validos</h3>
              <p className="kpi-number kpi-good">{analysis.valid_records}</p>
              <p className="kpi-sub">Base del resumen principal</p>
            </article>
            <article className="card">
              <h3>Registros invalidos</h3>
              <p className="kpi-number kpi-warn">{analysis.invalid_records}</p>
              <p className="kpi-sub">Marcados y excluidos del analisis</p>
            </article>
            <article className="card">
              <h3>Satisfaccion media</h3>
              <p className="kpi-number">{analysis.satisfaction.average_score.toFixed(2)}</p>
              <p className="kpi-sub">Solo casos CLOSED con score</p>
            </article>
          </section>

          <section className="panel-grid incidents-panels">
            <article className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Calidad del archivo</p>
                  <h3>Desglose de registros invalidos</h3>
                </div>
                <span className="chip chip-danger">{analysis.invalid_records} invalidos</span>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Regla</th>
                    <th>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.invalid_breakdown.map((item) => (
                    <tr key={item.code}>
                      <td>{item.label}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Casos cerrados</p>
                  <h3>Indice de satisfaccion</h3>
                </div>
                <span className="chip chip-ok">
                  {analysis.satisfaction.scored_closed_cases}/{analysis.satisfaction.total_closed_cases} con score
                </span>
              </div>
              <p className="score-highlight">{analysis.satisfaction.average_score.toFixed(2)} / 5.00</p>
              <table className="table">
                <thead>
                  <tr>
                    <th>Score</th>
                    <th>Etiqueta</th>
                    <th>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.satisfaction.score_breakdown.map((item) => (
                    <tr key={item.code}>
                      <td>{item.code}</td>
                      <td>{item.label}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </section>

          <section className="panel-grid incidents-panels">
            <article className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Distribucion principal</p>
                  <h3>Incidencias por categoria</h3>
                </div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Cantidad</th>
                    <th>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.category_breakdown.map((item) => (
                    <tr key={item.code}>
                      <td>{item.label}</td>
                      <td>{item.count}</td>
                      <td>{percentageLabel(item.percentage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Seguimiento operativo</p>
                  <h3>Incidencias por estado</h3>
                </div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Cantidad</th>
                    <th>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.status_breakdown.map((item) => (
                    <tr key={item.code}>
                      <td>{item.label}</td>
                      <td>{item.count}</td>
                      <td>{percentageLabel(item.percentage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </section>
        </>
      ) : (
        <section className="card empty-state">
          <p className="eyebrow">Pendiente de analisis</p>
          <h3>No hay resultados cargados todavia</h3>
          <p className="muted">
            Sube un archivo para ver el resumen de validacion, el desglose por categoria, el estado de los casos y el indice de satisfaccion.
          </p>
        </section>
      )}
    </div>
  );
}