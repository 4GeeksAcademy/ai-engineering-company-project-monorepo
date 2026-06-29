import type {
  Candidate,
  CandidateCreate,
  CandidatePatch,
  CandidateStatus,
  CandidateStage,
  Note,
  NoteCreate,
  RecordsResponse,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = await response.json();
      detail = body.detail ?? body.message;
    } catch {}
    throw new ApiRequestError(response.status, detail ?? response.statusText);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export class ApiRequestError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.detail = detail;
  }
}

export interface GetRecordsParams {
  status?: CandidateStatus;
  stage?: CandidateStage;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getRecords(
  params?: GetRecordsParams,
): Promise<RecordsResponse> {
  return request<RecordsResponse>(
    buildUrl("/records", params as Record<string, string | number | undefined>),
  );
}

export async function getRecord(id: string): Promise<Candidate> {
  return request<Candidate>(buildUrl(`/records/${id}`));
}

export async function createRecord(
  data: CandidateCreate,
): Promise<Candidate> {
  return request<Candidate>(buildUrl("/records"), {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRecord(
  id: string,
  data: CandidateCreate,
): Promise<Candidate> {
  return request<Candidate>(buildUrl(`/records/${id}`), {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function patchRecord(
  id: string,
  data: CandidatePatch,
): Promise<Candidate> {
  return request<Candidate>(buildUrl(`/records/${id}`), {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteRecord(id: string): Promise<void> {
  return request<void>(buildUrl(`/records/${id}`), {
    method: "DELETE",
  });
}

export async function addNote(
  recordId: string,
  data: NoteCreate,
): Promise<Note> {
  return request<Note>(buildUrl(`/records/${recordId}/notes`), {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteNote(
  recordId: string,
  noteId: string,
): Promise<void> {
  return request<void>(
    buildUrl(`/records/${recordId}/notes/${noteId}`),
    { method: "DELETE" },
  );
}
