"use client";

import { ChangeEvent, useState } from "react";

type Result = {
  total_records: number; valid_records: number; invalid_records: number;
  invalid_breakdown: Record<string, number>; by_category: Record<string, number>;
  by_status: Record<string, number>; scored_tickets: number; closed_tickets: number;
  average_score: number | null; score_breakdown: Record<string, number>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setLoading(true);
    const body = new FormData(); body.append("file", file);
    try {
      const response = await fetch(`${API_URL}/api/incidents/analyze`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "No se pudo analizar el archivo");
      setResult(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Error inesperado"); }
    finally { setLoading(false); }
  }

  return <main>
    <h1>Analizador de incidentes Nexova</h1>
    <p>Carga un CSV de tickets para obtener un resumen seguro. Nunca se muestran correos individuales.</p>
    <section className="card drop"><label htmlFor="csv">Selecciona el archivo CSV</label><br /><input id="csv" type="file" accept=".csv,text/csv" onChange={upload} /></section>
    {loading && <p>Analizando...</p>}{error && <p className="error">{error}</p>}
    {result && <>
      <section className="card"><h2>Resumen general</h2><div className="grid"><strong>Total: {result.total_records}</strong><strong>Válidos: {result.valid_records}</strong><strong>Inválidos: {result.invalid_records}</strong><strong>Satisfacción: {result.average_score?.toFixed(2) ?? "N/A"} / 5.00</strong></div></section>
      <section className="card"><h2>Registros inválidos</h2><table><tbody>{Object.entries(result.invalid_breakdown).map(([key, value]) => <tr key={key}><td>{key}</td><td>{value}</td></tr>)}</tbody></table></section>
      <section className="card"><h2>Por categoría</h2><table><tbody>{Object.entries(result.by_category).map(([key, value]) => <tr key={key}><td>{key}</td><td>{value}</td></tr>)}</tbody></table><h2>Por estado</h2><table><tbody>{Object.entries(result.by_status).map(([key, value]) => <tr key={key}><td>{key}</td><td>{value}</td></tr>)}</tbody></table></section>
      <section className="card"><h2>Exportación</h2><a href={`${API_URL}/api/incidents/results/export`}><button type="button">Descargar resultados CSV</button></a></section>
    </>}
  </main>;
}
