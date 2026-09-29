"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

type CountItem = { key: string; count: number; percentage: number };
type IncidentAnalysisResult = {
  source_name: string;
  totals: { total_records: number; valid_records: number; invalid_records: number };
  invalid_by_rule: { key: string; label: string; count: number }[];
  by_category: CountItem[];
  by_status: CountItem[];
  by_country: CountItem[];
  satisfaction: {
    closed_records: number;
    scored_closed_records: number;
    average_score: number | null;
    distribution: { score: number; count: number }[];
  };
};

// Use the Next.js same-origin proxy so the browser doesn't need to reach the API directly.
const API_BASE = "";

export function IncidentAnalysis() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<IncidentAnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setError("");
    setResult(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a .csv file.");
      return;
    }
    const data = new FormData();
    data.append("file", file);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/incidents/analyze`, { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? "Could not analyze this file.");
      setResult(payload as IncidentAnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the analysis service.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    void upload(event.currentTarget.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files[0]);
  }

  return (
    <section className="section-block incident-analysis-section" aria-label="Incident analysis">
      <div className="incident-upload-panel">
        <h2>Upload incident CSV</h2>
        <p className="incident-upload-intro">Select a file or drag and drop it into the box below.</p>
        <div
          className={`incident-dropzone${dragging ? " is-dragging" : ""}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onChange} aria-label="Choose incident CSV" />
          <span className="incident-upload-icon" aria-hidden="true">⇧</span>
          <strong className="incident-drop-title">Drag and drop your CSV file here</strong>
          <span className="incident-drop-hint">UTF-8 .csv files only</span>
          <span className="incident-drop-or">or</span>
          <button className="button" type="button" onClick={() => inputRef.current?.click()} disabled={loading}>
            {loading ? "Analyzing…" : "Browse files"}
          </button>
          <span className="incident-privacy-hint">Data is processed into aggregate metrics only.</span>
        </div>
      </div>

      {error && <div className="incident-alert" role="alert">{error}</div>}

      {result && (
        <div className="incident-results" aria-live="polite">
          <div className="incident-results-heading">
            <div><p className="eyebrow">Analysis complete</p><h2>Network summary</h2><p className="incident-source">Source: {result.source_name}</p></div>
            <a className="button" href={`${API_BASE}/api/incidents/results/export`}>Download results CSV <span aria-hidden="true">↓</span></a>
          </div>
          <div className="incident-total-grid">
            <article className="incident-total"><span>Total records</span><strong>{result.totals.total_records}</strong></article>
            <article className="incident-total"><span>Valid records</span><strong>{result.totals.valid_records}</strong></article>
            <article className="incident-total incident-invalid"><span>Invalid records</span><strong>{result.totals.invalid_records}</strong></article>
          </div>
          {result.totals.invalid_records > 0 && (
            <div className="incident-invalid-details">
              <h3>Invalid records by rule</h3>
              <p>Counts are per validation rule; a record with multiple issues can be counted under more than one rule. No patient data is shown.</p>
              <ul>{result.invalid_by_rule.map((item) => <li key={item.key}><span>{item.label}</span><strong>{item.count}</strong></li>)}</ul>
            </div>
          )}
          <div className="incident-breakdown-grid">
            <Breakdown title="By category" items={result.by_category} />
            <Breakdown title="By status" items={result.by_status} />
            <Breakdown title="By country" items={result.by_country} />
          </div>
          <article className="incident-satisfaction">
            <div><p className="eyebrow">Closed cases</p><h3>Satisfaction index</h3></div>
            <strong className="satisfaction-average">{result.satisfaction.average_score?.toFixed(2) ?? "N/A"}<small> / 5.00</small></strong>
            <p>Scored cases: {result.satisfaction.scored_closed_records} of {result.satisfaction.closed_records}</p>
            <div className="satisfaction-distribution">{result.satisfaction.distribution.map(({ score, count }) => <div key={score}><span>Score {score}</span><strong>{count}</strong></div>)}</div>
          </article>
        </div>
      )}
    </section>
  );
}

function Breakdown({ title, items }: { title: string; items: CountItem[] }) {
  return (
    <article className="panel incident-breakdown">
      <h3>{title}</h3>
      <ul>{items.map((item) => <li key={item.key}><span>{item.key.replaceAll("_", " ")}</span><strong>{item.count}<small>{item.percentage.toFixed(1)}%</small></strong></li>)}</ul>
    </article>
  );
}
