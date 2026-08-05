export type BreakdownItem = {
  code: string;
  label: string;
  count: number;
  percentage?: number | null;
};

export type IncidentAnalysisResponse = {
  source_file: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  invalid_breakdown: BreakdownItem[];
  category_breakdown: BreakdownItem[];
  status_breakdown: BreakdownItem[];
  satisfaction: {
    scored_closed_cases: number;
    total_closed_cases: number;
    average_score: number;
    score_breakdown: BreakdownItem[];
  };
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_INCIDENTS_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export async function analyzeIncidentsFile(file: File): Promise<IncidentAnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/incidents/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const fallbackMessage = `No se pudo analizar el archivo (${response.status}).`;
    if (response.headers.get("content-type")?.includes("application/json")) {
      const payload = (await response.json()) as { detail?: string };
      throw new Error(payload.detail || fallbackMessage);
    }

    throw new Error(fallbackMessage);
  }

  return (await response.json()) as IncidentAnalysisResponse;
}

export function getIncidentsExportUrl(): string {
  return `${API_BASE_URL}/api/incidents/results/export`;
}