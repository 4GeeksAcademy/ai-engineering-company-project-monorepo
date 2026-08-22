import {
  Candidate,
  CandidateInput,
  CandidatePatch,
  Note,
} from "@/types/candidate";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  console.warn(
    "NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.local and set it."
  );
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.message) message = errorBody.message;
    } catch {}
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Shape returned by list endpoints (GET /records, GET /records/:id/notes) —
// confirmed via curl against the live API: the array is wrapped inside
// "data", alongside pagination info.
interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  data: T[];
}

export const api = {
  // Candidate list & detail
  getCandidates: async () => {
    const response = await apiFetch<PaginatedResponse<Candidate>>("/records?limit=200");
    return response.data;
  },
  getCandidate: (id: string) => apiFetch<Candidate>(`/records/${id}`),

  // Candidate management
  createCandidate: (data: CandidateInput) =>
    apiFetch<Candidate>("/records", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCandidate: (id: string, data: CandidateInput) =>
    apiFetch<Candidate>(`/records/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  patchCandidate: (id: string, data: CandidatePatch) =>
    apiFetch<Candidate>(`/records/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Notes
  getNotes: async (id: string) => {
    const response = await apiFetch<PaginatedResponse<Note> | Note[]>(`/records/${id}/notes`);
    return Array.isArray(response) ? response : response.data;
  },
  addNote: (id: string, content: string) =>
    apiFetch<Note>(`/records/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  deleteNote: (id: string, noteId: string) =>
    apiFetch<void>(`/records/${id}/notes/${noteId}`, {
      method: "DELETE",
    }),
};