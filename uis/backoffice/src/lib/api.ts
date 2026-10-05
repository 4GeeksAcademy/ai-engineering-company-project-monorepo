import type { AnalysisResult } from "@/lib/types";

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string; detail?: string };
    return payload.error || payload.detail || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function analyzeIncidents(file: File): Promise<AnalysisResult> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/incidents/analyze", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as AnalysisResult;
}

export async function downloadResultsCsv(): Promise<void> {
  const response = await fetch("/api/incidents/results/export");
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "results.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
