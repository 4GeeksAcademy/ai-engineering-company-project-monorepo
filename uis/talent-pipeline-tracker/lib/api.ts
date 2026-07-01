import type {
  ApiValidationError,
  Note,
  NoteCreate,
  PaginatedRecords,
  RecordCreate,
  RecordOut,
  RecordPatch,
  RecordsQueryParams,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://playground.4geeks.com/tracker/api/v1";

export class ApiError extends Error {
  status: number;
  details?: ApiValidationError;

  constructor(message: string, status: number, details?: ApiValidationError) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path: string, params?: RecordsQueryParams): string {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    if (params.status) url.searchParams.set("status", params.status);
    if (params.stage) url.searchParams.set("stage", params.stage);
    if (params.search) url.searchParams.set("search", params.search);
    if (params.page) url.searchParams.set("page", String(params.page));
    if (params.limit) url.searchParams.set("limit", String(params.limit));
  }

  return url.toString();
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  params?: RecordsQueryParams,
): Promise<T> {
  const response = await fetch(buildUrl(path, params), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  const hasJson = contentType?.includes("application/json");
  const body = hasJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      body?.detail?.[0]?.msg ??
      body?.message ??
      `Error en la petición (${response.status})`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

export async function getRecords(
  params?: RecordsQueryParams,
): Promise<PaginatedRecords> {
  return request<PaginatedRecords>("/records", { method: "GET" }, params);
}

export async function getRecord(id: string): Promise<RecordOut> {
  return request<RecordOut>(`/records/${id}`, { method: "GET" });
}

export async function createRecord(data: RecordCreate): Promise<RecordOut> {
  return request<RecordOut>("/records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRecord(
  id: string,
  data: RecordCreate,
): Promise<RecordOut> {
  return request<RecordOut>(`/records/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function patchRecord(
  id: string,
  data: RecordPatch,
): Promise<RecordOut> {
  return request<RecordOut>(`/records/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteRecord(id: string): Promise<void> {
  return request<void>(`/records/${id}`, { method: "DELETE" });
}

export async function getNotes(id: string): Promise<Note[]> {
  const result = await request<Note[] | { data: Note[] }>(
    `/records/${id}/notes`,
    { method: "GET" },
  );

  if (Array.isArray(result)) {
    return result;
  }

  return result.data ?? [];
}

export async function addNote(id: string, data: NoteCreate): Promise<Note> {
  return request<Note>(`/records/${id}/notes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteNote(
  recordId: string,
  noteId: string,
): Promise<void> {
  return request<void>(`/records/${recordId}/notes/${noteId}`, {
    method: "DELETE",
  });
}
