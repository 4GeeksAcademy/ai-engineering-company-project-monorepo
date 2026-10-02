import type { AnalyzeResponse } from "../types/incidents";

// Vacío = mismo origen: en desarrollo el proxy de Vite reenvía /api a la API local.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((e: { loc?: unknown[]; msg?: string }) => {
          const field = e.loc?.slice(1).join(".");
          const message = (e.msg ?? "").replace(/^Value error, /, "");
          return field ? `${field}: ${message}` : message;
        })
        .join("; ");
    }
    return response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function analyzeIncidentsFile(file: File): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/incidents/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response), response.status);
  }

  return response.json();
}

export async function downloadResultsCsv(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/incidents/results/export`);

  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response), response.status);
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
