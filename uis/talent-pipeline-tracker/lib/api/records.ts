import { apiFetch } from "./api-fetch";
import { STAGE_LABELS, STATUS_LABELS } from "@/lib/constants";
import type {
  CandidateListResponse,
  GetRecordsParams,
} from "@/types/candidate";

// Type guard: an object whose fields can be read and checked one by one.
// Record<string, unknown> = any key may be read; each value is unknown until checked.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// A candidate has everything the list displays: id, name, position,
// and a status/stage we have a UI label for.
function isListCandidate(item: unknown): boolean {
  return (
    isObject(item) &&
    typeof item.id === "string" &&
    typeof item.full_name === "string" &&
    typeof item.position === "string" &&
    typeof item.status === "string" &&
    Object.hasOwn(STATUS_LABELS, item.status) &&
    typeof item.stage === "string" &&
    Object.hasOwn(STAGE_LABELS, item.stage)
  );
}

/**
 * Checks that the response really has the shape we expect,
 * so a broken API answer shows an error instead of a blank list.
 * This is a type guard. It checks at runtime that data from your
 * API actually has the shape your TypeScript types claim it has.
 */
function isCandidateListResponse(
  value: unknown,
): value is CandidateListResponse {
  return (
    isObject(value) &&
    typeof value.total === "number" &&
    typeof value.page === "number" &&
    typeof value.limit === "number" &&
    Array.isArray(value.data) &&
    value.data.every(isListCandidate)
  );
}

// GET /records: one page of candidates, optionally filtered
export async function getRecords(
  params: GetRecordsParams = {},
): Promise<CandidateListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  if (params.stage) query.set("stage", params.stage);
  if (params.search?.trim()) query.set("search", params.search.trim());

  const qs = query.toString();
  const data = await apiFetch<unknown>(qs ? `/records?${qs}` : "/records");

  if (!isCandidateListResponse(data)) {
    throw new Error("The candidate list came back in an unexpected format.");
  }
  return data;
}
