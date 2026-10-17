import { API_BASE } from "@/lib/tracker-config";
import type {
  Note,
  NotesResponse,
  RecordSummary,
  RecordsResponse,
  TrackerFilters,
} from "@/types/tracker";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as unknown) : null;

  if (!response.ok) {
    if (typeof payload === "object" && payload && "detail" in payload) {
      throw new Error(String((payload as { detail: unknown }).detail));
    }

    if (typeof payload === "object" && payload && "error" in payload) {
      throw new Error(String((payload as { error: unknown }).error));
    }

    throw new Error(`La API respondió con ${response.status}.`);
  }

  return payload as T;
}

export async function fetchRecords(filters: TrackerFilters) {
  const params = new URLSearchParams({ limit: "200" });

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.stage) {
    params.set("stage", filters.stage);
  }

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }

  return request<RecordsResponse>(`/records?${params.toString()}`);
}

export async function fetchRecordDetail(recordId: string) {
  const [record, notes] = await Promise.all([
    request<RecordSummary>(`/records/${recordId}`),
    request<NotesResponse>(`/records/${recordId}/notes`),
  ]);

  return { record, notes };
}

export async function patchRecord(recordId: string, body: { status?: string; stage?: string }) {
  return request<RecordSummary>(`/records/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function createRecord(body: Record<string, unknown>) {
  return request<RecordSummary>("/records", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateRecord(recordId: string, body: Record<string, unknown>) {
  return request<RecordSummary>(`/records/${recordId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function createNote(recordId: string, content: string) {
  return request<Note>(`/records/${recordId}/notes`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function deleteNote(recordId: string, noteId: string) {
  return request<null>(`/records/${recordId}/notes/${noteId}`, {
    method: "DELETE",
  });
}