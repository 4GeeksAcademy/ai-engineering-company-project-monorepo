import { request } from "@/services/api";
import {
  CandidateInput,
  CandidatePatch,
  CandidateRecord,
  Note,
  NoteInput,
  NotesResponse,
  PaginatedRecordsResponse,
} from "@/types/records";

export async function getAllRecords(): Promise<CandidateRecord[]> {
  const firstPage = await request<PaginatedRecordsResponse>("/records?page=1&limit=50");

  const records = [...firstPage.data];
  const totalPages = Math.ceil(firstPage.total / firstPage.limit);

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await request<PaginatedRecordsResponse>(`/records?page=${page}&limit=50`);
    records.push(...nextPage.data);
  }

  return records;
}

export async function getRecordById(id: string): Promise<CandidateRecord> {
  return request<CandidateRecord>(`/records/${id}`);
}

export async function createRecord(payload: CandidateInput): Promise<CandidateRecord> {
  return request<CandidateRecord>("/records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRecord(id: string, payload: CandidateInput): Promise<CandidateRecord> {
  return request<CandidateRecord>(`/records/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function patchRecord(id: string, payload: CandidatePatch): Promise<CandidateRecord> {
  return request<CandidateRecord>(`/records/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getNotesByRecord(id: string): Promise<Note[]> {
  const response = await request<NotesResponse>(`/records/${id}/notes`);
  return response.data;
}

export async function addNote(id: string, payload: NoteInput): Promise<Note> {
  return request<Note>(`/records/${id}/notes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteNote(id: string, noteId: string): Promise<void> {
  await request<void>(`/records/${id}/notes/${noteId}`, {
    method: "DELETE",
  });
}
