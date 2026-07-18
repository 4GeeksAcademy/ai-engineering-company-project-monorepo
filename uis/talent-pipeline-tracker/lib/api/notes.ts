import { apiJsonRequest, apiNoContentRequest } from "@/lib/api/client";
import type { CandidateNote, NoteCreatePayload } from "@/types/note";

function normalizeNotes(payload: unknown): CandidateNote[] {
  if (Array.isArray(payload)) {
    return payload as CandidateNote[];
  }

  if (typeof payload === "object" && payload !== null) {
    const possibleNotes = payload as { notes?: CandidateNote[]; data?: CandidateNote[] };

    if (Array.isArray(possibleNotes.notes)) {
      return possibleNotes.notes;
    }

    if (Array.isArray(possibleNotes.data)) {
      return possibleNotes.data;
    }
  }

  return [];
}

export async function getNotes(recordId: string): Promise<CandidateNote[]> {
  const payload = await apiJsonRequest<unknown>(`/records/${recordId}/notes`);
  return normalizeNotes(payload);
}

export async function addNote(recordId: string, payload: NoteCreatePayload): Promise<CandidateNote | void> {
  return apiJsonRequest<CandidateNote | void>(`/records/${recordId}/notes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteNote(recordId: string, noteId: string): Promise<void> {
  await apiNoContentRequest(`/records/${recordId}/notes/${noteId}`, {
    method: "DELETE",
  });
}
