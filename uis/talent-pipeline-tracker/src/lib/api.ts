import type { ApiCandidate, Candidate, CandidateNote, CandidatePayload } from "./types";

const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!baseUrl) {
    throw new Error("API is not configured. Set NEXT_PUBLIC_API_URL in your environment.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }

  if (response.status === 204) return undefined as T;
  if (response.status === 205) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("The server returned an unexpected response format.");
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("The server returned invalid JSON.");
  }
}

function recordPath(id: string) {
  return `/records/${encodeURIComponent(id)}`;
}

function normalizeCandidate(value: ApiCandidate | Candidate): Candidate {
  const record = value as ApiCandidate;
  const candidate = value as Candidate;
  const name = record.full_name ?? candidate.name;
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("The candidate response is missing a full name.");
  }
  return {
    id: record.id,
    name,
    email: record.email,
    phone: record.phone ?? undefined,
    position: record.position,
    linkedin: record.linkedin_url ?? candidate.linkedin ?? undefined,
    cv_link: record.cv_url ?? candidate.cv_link ?? undefined,
    years_experience: record.experience_years ?? candidate.years_experience ?? undefined,
    status: record.status,
    stage: record.stage,
    application_date: record.applied_at ?? candidate.application_date,
  };
}

function toApiPayload(payload: CandidatePayload) {
  return {
    full_name: payload.name,
    email: payload.email,
    phone: payload.phone || null,
    position: payload.position,
    linkedin_url: payload.linkedin || null,
    cv_url: payload.cv_link || null,
    experience_years: payload.years_experience ?? null,
    status: payload.status,
    stage: payload.stage,
    applied_at: payload.application_date,
  };
}

export async function listCandidates(): Promise<Candidate[]> {
  const result = await api<ApiCandidate[] | { data: ApiCandidate[]; total?: number; page?: number; limit?: number }>("/records?page=1&limit=100");
  const candidates = Array.isArray(result) ? result : result?.data;
  if (!Array.isArray(candidates)) throw new Error("The candidate response has an unexpected shape.");
  return candidates.map((candidate) => normalizeCandidate(candidate));
}

export async function getCandidate(id: string): Promise<Candidate> {
  const result = await api<ApiCandidate | Candidate | { data: ApiCandidate | Candidate }>(recordPath(id));
  const candidate = "data" in result ? result.data : result;
  if (!candidate || typeof candidate !== "object" || !candidate.id) {
    throw new Error("The candidate response is malformed.");
  }
  return normalizeCandidate(candidate);
}

export async function createCandidate(payload: CandidatePayload): Promise<Candidate> {
  const result = await api<ApiCandidate | Candidate | { data: ApiCandidate | Candidate }>("/records", { method: "POST", body: JSON.stringify(toApiPayload(payload)) });
  return normalizeCandidate("data" in result ? result.data : result);
}

export async function updateCandidate(id: string, payload: CandidatePayload): Promise<Candidate> {
  const result = await api<ApiCandidate | Candidate | { data: ApiCandidate | Candidate }>(recordPath(id), { method: "PUT", body: JSON.stringify(toApiPayload(payload)) });
  return normalizeCandidate("data" in result ? result.data : result);
}

export async function patchCandidate(id: string, payload: Partial<Pick<Candidate, "status" | "stage">>): Promise<Candidate> {
  const result = await api<ApiCandidate | Candidate | { data: ApiCandidate | Candidate }>(recordPath(id), { method: "PATCH", body: JSON.stringify(payload) });
  return normalizeCandidate("data" in result ? result.data : result);
}

export async function listNotes(id: string): Promise<CandidateNote[]> {
  const result = await api<CandidateNote[] | { data: CandidateNote[]; meta?: unknown }>(`${recordPath(id)}/notes`);
  const notes = Array.isArray(result) ? result : result?.data;
  if (!Array.isArray(notes)) throw new Error("The notes response has an unexpected shape.");
  return notes;
}

export async function addNote(id: string, content: string): Promise<CandidateNote> {
  const result = await api<CandidateNote | { data: CandidateNote }>(`${recordPath(id)}/notes`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return "data" in result ? result.data : result;
}

export async function deleteNote(candidateId: string, noteId: string): Promise<void> {
  await api<void>(`${recordPath(candidateId)}/notes/${encodeURIComponent(noteId)}`, { method: "DELETE" });
}
