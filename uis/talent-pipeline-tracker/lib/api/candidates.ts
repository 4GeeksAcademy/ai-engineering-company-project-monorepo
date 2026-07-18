import { apiJsonRequest } from "@/lib/api/client";
import type {
  CandidateListResponse,
  CandidateRecord,
  CandidateStage,
  CandidateStatus,
  PaginatedCandidates,
  CandidateUpsertPayload,
} from "@/types/candidate";

function normalizeCandidateList(payload: CandidateListResponse | CandidateRecord[]): CandidateRecord[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.records)) {
    return payload.records;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

interface GetRecordsParams {
  page?: number;
  limit?: number;
  status?: CandidateStatus | "";
  stage?: CandidateStage | "";
  search?: string;
}

export async function getRecords(params?: GetRecordsParams): Promise<PaginatedCandidates> {
  const query = new URLSearchParams();
  query.set("page", String(params?.page ?? 1));
  query.set("limit", String(params?.limit ?? 20));

  if (params?.status) {
    query.set("status", params.status);
  }

  if (params?.stage) {
    query.set("stage", params.stage);
  }

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }

  const payload = await apiJsonRequest<CandidateListResponse | CandidateRecord[]>(`/records?${query.toString()}`);

  const items = normalizeCandidateList(payload);
  const resolvedPage = Array.isArray(payload) ? params?.page ?? 1 : (payload.page ?? params?.page ?? 1);
  const resolvedLimit = Array.isArray(payload) ? params?.limit ?? 20 : (payload.limit ?? params?.limit ?? 20);
  const resolvedTotal = Array.isArray(payload) ? items.length : (payload.total ?? items.length);
  const totalPages = Math.max(1, Math.ceil(resolvedTotal / resolvedLimit));

  return {
    items,
    total: resolvedTotal,
    page: resolvedPage,
    limit: resolvedLimit,
    totalPages,
  };
}

export async function getRecordById(id: string): Promise<CandidateRecord> {
  return apiJsonRequest<CandidateRecord>(`/records/${id}`);
}

export async function patchRecord(
  id: string,
  payload: { status?: CandidateStatus; stage?: CandidateStage },
): Promise<CandidateRecord> {
  return apiJsonRequest<CandidateRecord>(`/records/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createRecord(payload: CandidateUpsertPayload): Promise<CandidateRecord> {
  return apiJsonRequest<CandidateRecord>("/records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function replaceRecord(id: string, payload: CandidateUpsertPayload): Promise<CandidateRecord> {
  return apiJsonRequest<CandidateRecord>(`/records/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
