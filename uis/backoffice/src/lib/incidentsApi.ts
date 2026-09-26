export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ProblemKind = "missing" | "invalid";

export type AnalysisResult = {
  total_records: number;
  valid_records: number;
  invalid_records: number;
  invalid_breakdown: Record<string, number>;
  invalid_by_field: Record<string, Partial<Record<ProblemKind, number>>>;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  scored_tickets: number;
  closed_tickets: number;
  average_score: number | null;
  score_breakdown: Record<string, number>;
  labels: { rules: Record<string, string>; problems: Record<string, string>; scores: Record<string, string> };
};

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
  } catch {
    /* non-JSON error body */
  }
  return `${fallback} (HTTP ${response.status})`;
}

export async function analyzeIncidents(file: File): Promise<AnalysisResult> {
  const body = new FormData();
  body.append("file", file);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/incidents/analyze`, { method: "POST", body });
  } catch {
    throw new Error(`No se pudo conectar con la API en ${API_URL}. ¿Está arrancada?`);
  }
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudo analizar el archivo"));
  return response.json();
}

export async function downloadResultsCsv(): Promise<void> {
  const response = await fetch(`${API_URL}/api/incidents/results/export`);
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudo descargar el CSV"));
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "results.csv";
  link.click();
  URL.revokeObjectURL(url);
}
