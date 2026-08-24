"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import Link from "next/link";

type Analysis = {
  total: number;
  valid: number;
  invalid: number;
  invalid_counts: Record<string, number>;
  category_counts: Record<string, number>;
  status_counts: Record<string, number>;
  closed_count: number;
  scored_count: number;
  average_score: number | null;
};

const API_URL = process.env.NEXT_PUBLIC_ANALYZER_API_URL ?? "http://localhost:8000";
const invalidLabels: Record<string, string> = {
  missing_client_company: "Missing client company",
  invalid_category: "Invalid or missing category",
  invalid_email: "Invalid or missing email",
  closed_without_score: "Closed ticket without score",
  invalid_description: "Invalid or missing description",
  invalid_agent_id: "Invalid or missing agent ID",
  invalid_satisfaction_score: "Satisfaction score out of range",
};

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <article className={`incident-metric ${accent ? "incident-metric-accent" : ""}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

export default function IncidentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chooseFile = (nextFile: File | undefined) => { setError(""); setAnalysis(null); if (!nextFile) return; if (!nextFile.name.toLowerCase().endsWith(".csv")) { setFile(null); setError("Please choose a CSV file. Other file types cannot be analyzed."); return; } setFile(nextFile); };
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0]);
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); setIsDragging(false); chooseFile(event.dataTransfer.files?.[0]); };
  const analyzeFile = async () => {
    if (!file) { setError("Choose an incident CSV before starting the analysis."); return; }
    setIsLoading(true); setError(""); setAnalysis(null);
    const formData = new FormData(); formData.append("file", file);
    try {
      const response = await fetch(`${API_URL}/api/incidents/analyze`, { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail ?? "The incident file could not be analyzed.");
      setAnalysis(payload as Analysis);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "The analyzer API is unavailable. Check that it is running and try again."); } finally { setIsLoading(false); }
  };
  const validRate = analysis && analysis.total ? Math.round((analysis.valid / analysis.total) * 100) : 0;
  const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
  const exportUrl = `${API_URL}/api/incidents/results/export`;

  return <main className="incident-page"><aside className="incident-nav"><Link className="incident-brand" href="/"><b>N</b><span><strong>Nexova</strong><small>Operations studio</small></span></Link><nav aria-label="Backoffice navigation"><a className="active" href="#analyze">01 &nbsp; Analyze incidents</a><a href="#summary">02 &nbsp; Latest summary</a></nav><small className="incident-connected">● Analyzer API connected locally</small></aside><section className="incident-main"><header className="incident-header"><div><p>Customer support operations / Nexova</p><h1>Incident report analyzer</h1></div><span>RS</span></header><div className="incident-content"><section className="incident-hero" id="analyze"><div><p>01 / Intake</p><h2>Turn a support export into a useful brief.</h2><span>Upload the latest incident report to validate its records and surface the patterns your support team needs to act on.</span></div><b>NEX<br />OPS</b></section><section className="incident-upload"><header><div><p>Source file</p><h2>Upload incident CSV</h2></div><small>CSV only</small></header><label className={`incident-dropzone ${isDragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}><input type="file" accept=".csv,text/csv" onChange={handleFileChange} /><b>+</b><strong>{file ? file.name : "Drop your CSV here"}</strong><span>{file ? `${(file.size / 1024).toFixed(1)} KB ready to analyze` : "or choose a file from your computer"}</span></label><div className="incident-upload-actions"><span>Customer email values are never shown or exported.</span><button type="button" onClick={analyzeFile} disabled={isLoading}>{isLoading ? "Analyzing..." : "Analyze report"} <b>-&gt;</b></button></div>{error ? <p className="incident-error" role="alert">{error}</p> : null}{analysis ? <p className="incident-success" role="status">Analysis complete. The summary below is based on {file?.name}.</p> : null}</section>{analysis ? <section id="summary"><div className="incident-results-header"><div><p>02 / Readout</p><h2>Report summary</h2><span>Validated records only are used for the category, status, and satisfaction breakdowns.</span></div><a href={exportUrl}>Download results ↓</a></div><div className="incident-metrics"><Metric label="Total records" value={formatNumber(analysis.total)} detail="Rows received" accent /><Metric label="Valid records" value={formatNumber(analysis.valid)} detail={`${validRate}% of the report`} /><Metric label="Needs review" value={formatNumber(analysis.invalid)} detail="Records with issues" /><Metric label="Average satisfaction" value={analysis.average_score === null ? "N/A" : `${analysis.average_score.toFixed(2)}/5`} detail={`${analysis.scored_count} scored closed tickets`} /></div><div className="incident-summary-grid"><article><header><div><p>Record quality</p><h3>Invalid records</h3></div><b>{analysis.invalid}</b></header>{analysis.invalid ? Object.entries(analysis.invalid_counts).filter(([, count]) => count > 0).map(([key, count]) => <div className="incident-issue" key={key}><span>{invalidLabels[key] ?? key}</span><strong>{count}</strong></div>) : <span className="incident-muted">No invalid records found. This report is ready for operational use.</span>}</article><article><header><div><p>Valid records</p><h3>By category</h3></div><b>{analysis.valid}</b></header><div className="incident-bars">{Object.entries(analysis.category_counts).map(([category, count]) => <div key={category}><span>{category.replace("_", " ")} <strong>{count}</strong></span><i><em style={{ width: `${analysis.valid ? (count / analysis.valid) * 100 : 0}%` }} /></i></div>)}</div></article><article><header><div><p>Valid records</p><h3>By status</h3></div><b>{analysis.valid}</b></header><div className="incident-statuses">{Object.entries(analysis.status_counts).map(([status, count]) => <div key={status}><i className={status.toLowerCase()} />{status}<strong>{count}</strong></div>)}</div><div className="incident-score">Scored closed tickets<strong>{analysis.scored_count} <small>of {analysis.closed_count}</small></strong></div></article></div></section> : <section className="incident-empty" id="summary"><b>02</b><div><h2>Your summary will appear here.</h2><span>Upload a report to see data quality, support demand, and customer satisfaction in one view.</span></div></section>}<footer>Nexova customer support intelligence <i /> Privacy-first aggregate reporting</footer></div></section></main>;
}