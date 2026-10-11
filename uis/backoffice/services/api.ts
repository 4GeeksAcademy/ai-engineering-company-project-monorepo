import type { Candidate, CandidateNote, CandidateStage, CandidateStatus } from "@/types/models";

interface RecordOut {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  status: string;
  stage: string;
  experience_years: number;
  applied_at: string;
}

interface RecordsResponse {
  data: RecordOut[];
}

interface CandidateNoteOut {
  id: string;
  candidate_id: string;
  content: string;
  created_at: string;
}

interface CandidateNotesResponse {
  data: CandidateNoteOut[];
}

interface RecordResponse {
  data: RecordOut;
}

interface CandidateNoteResponse {
  data: CandidateNoteOut;
}

interface CandidatePayload {
  name: string;
  email: string;
  phone: string;
  position: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  yearsOfExperience: number;
  status: CandidateStatus;
  stage: CandidateStage;
  appliedAt: string;
}

function parseStatus(status: string): Candidate["status"] {
  if (
    status === "received"
    || status === "in_progress"
    || status === "selected"
    || status === "discarded"
  ) {
    return status;
  }

  throw new Error(`Estado invalido recibido desde la API: ${status}`);
}

function parseStage(stage: string): Candidate["stage"] {
  if (
    stage === "pending"
    || stage === "review"
    || stage === "personal_interview"
    || stage === "technical_interview"
    || stage === "offer_presented"
  ) {
    return stage;
  }

  throw new Error(`Etapa invalida recibida desde la API: ${stage}`);
}

function mapRecordToCandidate(record: RecordOut): Candidate {
  return {
    id: record.id,
    name: record.full_name,
    email: record.email,
    phone: record.phone,
    position: record.position,
    linkedinUrl: record.linkedin_url ?? undefined,
    resumeUrl: record.cv_url ?? undefined,
    yearsOfExperience: record.experience_years,
    status: parseStatus(record.status),
    stage: parseStage(record.stage),
    appliedAt: record.applied_at,
  };
}

function mapNoteToCandidateNote(note: CandidateNoteOut): CandidateNote {
  return {
    id: note.id,
    candidateId: note.candidate_id,
    content: note.content,
    createdAt: note.created_at,
  };
}

function mapCandidatePayloadToApi(payload: CandidatePayload): Omit<RecordOut, "id"> {
  return {
    full_name: payload.name,
    email: payload.email,
    phone: payload.phone,
    position: payload.position,
    linkedin_url: payload.linkedinUrl?.trim() ? payload.linkedinUrl : null,
    cv_url: payload.resumeUrl?.trim() ? payload.resumeUrl : null,
    status: payload.status,
    stage: payload.stage,
    experience_years: payload.yearsOfExperience,
    applied_at: payload.appliedAt,
  };
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("Falta NEXT_PUBLIC_API_BASE_URL en el entorno.");
  }

  return baseUrl.replace(/\/$/, "");
}

function getStringProperty(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object" || !(key in payload)) {
    return null;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

async function buildApiErrorMessage(response: Response): Promise<string> {
  const fallback = `Error API ${response.status}: ${response.statusText || "respuesta invalida"}`;

  try {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload: unknown = await response.json();
      const message = getStringProperty(payload, "message")
        ?? getStringProperty(payload, "error")
        ?? getStringProperty(payload, "detail");

      return message ? `Error API ${response.status}: ${message}` : fallback;
    }

    const text = await response.text();
    return text.trim() ? `Error API ${response.status}: ${text.trim()}` : fallback;
  } catch {
    return fallback;
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await buildApiErrorMessage(response));
  }

  return (await response.json()) as T;
}

async function sendJson<TResponse>(
  path: string,
  method: "POST" | "PUT" | "PATCH",
  body: unknown,
): Promise<TResponse> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await buildApiErrorMessage(response));
  }

  return (await response.json()) as TResponse;
}

function extractRecord(payload: RecordOut | RecordResponse): RecordOut {
  if ("data" in payload) {
    return payload.data;
  }

  return payload;
}

function extractNote(payload: CandidateNoteOut | CandidateNoteResponse): CandidateNoteOut {
  if ("data" in payload) {
    return payload.data;
  }

  return payload;
}

function extractNotes(payload: CandidateNoteOut[] | CandidateNotesResponse): CandidateNoteOut[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.data;
}

async function sendNoContent(path: string, method: "DELETE"): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await buildApiErrorMessage(response));
  }
}

export async function fetchCandidates(): Promise<Candidate[]> {
  const response = await getJson<RecordsResponse>("/records");
  return response.data.map(mapRecordToCandidate);
}

export async function fetchCandidateById(id: string): Promise<Candidate | null> {
  const response = await fetch(`${getApiBaseUrl()}/records/${id}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await buildApiErrorMessage(response));
  }

  const payload = (await response.json()) as RecordOut | RecordResponse;
  const record = extractRecord(payload);
  return mapRecordToCandidate(record);
}

export async function fetchCandidateNotes(candidateId: string): Promise<CandidateNote[]> {
  const response = await getJson<CandidateNotesResponse | CandidateNoteOut[]>(`/records/${candidateId}/notes`);
  return extractNotes(response).map(mapNoteToCandidateNote);
}

export async function updateCandidateStatus(
  candidateId: string,
  status: CandidateStatus,
): Promise<Candidate> {
  const response = await sendJson<RecordOut | RecordResponse>(`/records/${candidateId}`, "PATCH", { status });
  const record = extractRecord(response);
  return mapRecordToCandidate(record);
}

export async function updateCandidateStage(
  candidateId: string,
  stage: CandidateStage,
): Promise<Candidate> {
  const response = await sendJson<RecordOut | RecordResponse>(`/records/${candidateId}`, "PATCH", { stage });
  const record = extractRecord(response);
  return mapRecordToCandidate(record);
}

export async function addCandidateNote(candidateId: string, content: string): Promise<CandidateNote> {
  const response = await sendJson<CandidateNoteOut | CandidateNoteResponse>(
    `/records/${candidateId}/notes`,
    "POST",
    { content },
  );
  const note = extractNote(response);
  return mapNoteToCandidateNote(note);
}

export async function deleteCandidateNote(candidateId: string, noteId: string): Promise<void> {
  await sendNoContent(`/records/${candidateId}/notes/${noteId}`, "DELETE");
}

export async function createCandidate(payload: CandidatePayload): Promise<Candidate> {
  const response = await sendJson<RecordOut | RecordResponse>("/records", "POST", mapCandidatePayloadToApi(payload));
  const record = extractRecord(response);
  return mapRecordToCandidate(record);
}

export async function updateCandidate(
  candidateId: string,
  payload: CandidatePayload,
): Promise<Candidate> {
  const response = await sendJson<RecordOut | RecordResponse>(
    `/records/${candidateId}`,
    "PATCH",
    mapCandidatePayloadToApi(payload),
  );
  const record = extractRecord(response);
  return mapRecordToCandidate(record);
}
