import type {
  Candidate,
  CandidateNote,
  CandidatePatch,
  CandidatesResponse,
  CandidateStatus,
  CandidateStage,
  NoteCreate,
  NotesResponse,
  RecordCreate,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

interface FetchCandidatesParams {
  page?: number;
  limit?: number;
  search?: string;
  statuses?: CandidateStatus[];
  stages?: CandidateStage[];
}

/**
 * Fetches the candidate list from the Talent Tracker API.
 * Supports search (server-side), status and stage filters (applied client-side
 * since the API only accepts a single value per filter).
 * Runs on the server side (Server Component).
 */
export async function fetchCandidates({
  page = 1,
  limit = 20,
  search,
  statuses,
  stages,
}: FetchCandidatesParams = {}): Promise<CandidatesResponse> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search) {
    params.set("search", search);
  }

  const res = await fetch(`${API_URL}/records?${params.toString()}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch candidates: ${res.status} ${res.statusText}`
    );
  }

  let result = (await res.json()) as CandidatesResponse;

  // The API only accepts a single status/stage value, so we fetch enough data
  // and filter in-memory on the server when multiple values are selected.
  if (statuses && statuses.length > 0) {
    result.data = result.data.filter((c) => statuses.includes(c.status));
    result.total = result.data.length;
  }

  if (stages && stages.length > 0) {
    result.data = result.data.filter((c) => stages.includes(c.stage));
    result.total = result.data.length;
  }

  return result;
}

/**
 * Fetches a single candidate record from the Talent Tracker API by id.
 * Runs on the server side (Server Component).
 */
export async function fetchCandidate(id: string): Promise<Candidate> {
  const res = await fetch(`${API_URL}/records/${id}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch candidate ${id}: ${res.status} ${res.statusText}`
    );
  }

  return (await res.json()) as Candidate;
}

/**
 * PATCH /records/{id} to update a candidate's status and/or stage.
 * The PATCH request must be made from the browser (Client Component) so this
 * function uses a relative path and relies on a route handler or direct fetch.
 * Uses the full API_URL.
 */
export async function patchCandidate(
  id: string,
  body: CandidatePatch,
): Promise<Candidate> {
  const res = await fetch(`${API_URL}/records/${id}`, {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to update candidate ${id}: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
    );
  }

  return (await res.json()) as Candidate;
}

/**
 * Fetches a candidate's notes from GET /records/{id}/notes.
 * Runs on the server side (Server Component).
 */
export async function fetchNotes(id: string): Promise<CandidateNote[]> {
  const res = await fetch(`${API_URL}/records/${id}/notes`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch notes for candidate ${id}: ${res.status} ${res.statusText}`,
    );
  }

  const result = (await res.json()) as NotesResponse;
  return result.data;
}

/**
 * Creates a note for a candidate via POST /records/{id}/notes.
 * Called from the browser (Client Component).
 */
export async function createNote(
  id: string,
  body: NoteCreate,
): Promise<CandidateNote> {
  const res = await fetch(`${API_URL}/records/${id}/notes`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to add note for candidate ${id}: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
    );
  }

  return (await res.json()) as CandidateNote;
}

/**
 * Deletes a candidate's note via DELETE /records/{id}/notes/{note_id}.
 * Called from the browser (Client Component).
 */
export async function deleteNote(id: string, noteId: string): Promise<void> {
  const res = await fetch(`${API_URL}/records/${id}/notes/${noteId}`, {
    method: "DELETE",
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to delete note ${noteId} for candidate ${id}: ${res.status} ${res.statusText}`,
    );
  }
}

/**
 * Creates a new candidate via POST /records.
 * Called from the browser (Client Component).
 */
export async function createCandidate(
  body: RecordCreate,
): Promise<Candidate> {
  const res = await fetch(`${API_URL}/records`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to create candidate: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
    );
  }

  return (await res.json()) as Candidate;
}

/**
 * Replaces a candidate via PUT /records/{id}.
 * Called from the browser (Client Component).
 */
export async function updateCandidate(
  id: string,
  body: RecordCreate,
): Promise<Candidate> {
  const res = await fetch(`${API_URL}/records/${id}`, {
    method: "PUT",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to update candidate ${id}: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
    );
  }

  return (await res.json()) as Candidate;
}