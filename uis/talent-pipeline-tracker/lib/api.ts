/**
 * Thin typed wrappers around fetch for the Talent Tracker REST API.
 *
 * API: https://playground.4geeks.com/tracker/api/v1/docs
 *
 * Every call checks response.ok and surfaces HTTP errors and malformed
 * responses so the UI can display them.
 */

import type {
  Candidate,
  CreateCandidatePayload,
  CreateNotePayload,
  ListCandidatesResponse,
  ListNotesResponse,
  Note,
  PaginationParams,
  PatchCandidatePayload,
} from "@/types";

// ---------------------------------------------------------------------------
// Base URL — strip trailing slash once
// ---------------------------------------------------------------------------

function baseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) throw new Error("NEXT_PUBLIC_API_URL is not set");
  return raw.replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// Generic fetch helper
// ---------------------------------------------------------------------------

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let detail: string;
    try {
      detail = await res.text();
    } catch {
      detail = res.statusText;
    }
    throw new Error(detail || res.statusText);
  }

  // 204 No Content — return undefined
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

/**
 * GET /records — list candidates with optional filtering & pagination.
 * The server supports status, stage, and search query params directly.
 */
export function listCandidates(
  params?: PaginationParams
): Promise<ListCandidatesResponse> {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        qs.set(key, String(value));
      }
    });
  }
  const query = qs.toString();
  return api<ListCandidatesResponse>(`/records${query ? `?${query}` : ""}`);
}

export function getCandidate(id: string): Promise<Candidate> {
  return api<Candidate>(`/records/${id}`);
}

export function createCandidate(
  payload: CreateCandidatePayload
): Promise<Candidate> {
  return api<Candidate>("/records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * PUT /records/:id — full replacement.
 * Body uses the same RecordCreate shape.
 */
export function updateCandidate(
  id: string,
  payload: CreateCandidatePayload
): Promise<Candidate> {
  return api<Candidate>(`/records/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * PATCH /records/:id — partial update (only status & stage per API).
 */
export function patchCandidate(
  id: string,
  payload: PatchCandidatePayload
): Promise<Candidate> {
  return api<Candidate>(`/records/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export function listNotes(candidateId: string): Promise<ListNotesResponse> {
  return api<ListNotesResponse>(`/records/${candidateId}/notes`);
}

export function addNote(
  candidateId: string,
  payload: CreateNotePayload
): Promise<Note> {
  return api<Note>(`/records/${candidateId}/notes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteNote(
  candidateId: string,
  noteId: string
): Promise<void> {
  return api<void>(`/records/${candidateId}/notes/${noteId}`, {
    method: "DELETE",
  });
}