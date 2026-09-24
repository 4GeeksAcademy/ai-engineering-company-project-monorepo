import type { Candidate, CandidateFormValues, CandidateListResponse, CandidateNotesResponse, CandidateNote } from "@/types/candidate";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://playground.4geeks.com/tracker/api/v1";

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "The request failed.";

    try {
      const body = await response.json();
      message =
        body?.detail ||
        body?.message ||
        body?.error ||
        `Request failed with status ${response.status}`;
    } catch {
      message = `Request failed with status ${response.status}`;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return undefined as T;
}

export async function fetchCandidates(): Promise<CandidateListResponse> {
  return api<CandidateListResponse>("/records");
}

export async function fetchCandidateById(candidateId: string): Promise<Candidate> {
  return api<Candidate>(`/records/${candidateId}`);
}

export async function fetchCandidateNotes(candidateId: string): Promise<CandidateNotesResponse> {
  return api<CandidateNotesResponse>(`/records/${candidateId}/notes`);
}

export async function createCandidate(payload: CandidateFormValues): Promise<Candidate> {
  return api<Candidate>("/records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCandidate(
  candidateId: string,
  payload: CandidateFormValues,
): Promise<Candidate> {
  return api<Candidate>(`/records/${candidateId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function patchCandidate(
  candidateId: string,
  payload: Partial<Pick<Candidate, "status" | "stage">>,
): Promise<Candidate> {
  return api<Candidate>(`/records/${candidateId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function addCandidateNote(
  candidateId: string,
  content: string,
): Promise<CandidateNote> {
  return api<CandidateNote>(`/records/${candidateId}/notes`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function deleteCandidateNote(
  candidateId: string,
  noteId: string,
): Promise<void> {
  return api<void>(`/records/${candidateId}/notes/${noteId}`, {
    method: "DELETE",
  });
}
