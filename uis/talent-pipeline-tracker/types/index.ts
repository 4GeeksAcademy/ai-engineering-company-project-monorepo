/**
 * Core entity types matching the Talent Tracker API schema exactly.
 *
 * API docs: https://playground.4geeks.com/tracker/api/v1/docs
 * OpenAPI:  /tracker/api/v1/openapi.json
 */

/** Unique identifier used throughout the API */
export type Id = string;

// ---------------------------------------------------------------------------
// Candidate (record)
// ---------------------------------------------------------------------------

/**
 * Status values from the API:
 *   received | in_progress | selected | discarded
 */
export type CandidateStatus = string;

/**
 * Stage values from the API:
 *   pending | review | personal_interview | technical_interview | offer_presented
 */
export type CandidateStage = string;

/**
 * Full candidate/record object returned by GET /records and GET /records/:id.
 * Field names match the API's RecordOut schema exactly.
 */
export interface Candidate {
  id: Id;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  status: CandidateStatus;
  stage: CandidateStage;
  experience_years: number;
  notes_count: number;
  applied_at: string;
  updated_at: string;
}

/**
 * Payload for POST /records and PUT /records/:id (RecordCreate schema).
 * All fields except linkedin_url and cv_url are required by the API.
 */
export interface CreateCandidatePayload {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url?: string | null;
  cv_url?: string | null;
  experience_years: number;
}

/**
 * Body for PATCH /records/:id (RecordPatch schema).
 * Only status and stage are patchable.
 */
export interface PatchCandidatePayload {
  status?: string | null;
  stage?: string | null;
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export interface Note {
  id: Id;
  content: string;
  created_at?: string;
}

export interface CreateNotePayload {
  content: string;
}

// ---------------------------------------------------------------------------
// List responses
// ---------------------------------------------------------------------------

/**
 * Paginated response from GET /records.
 */
export interface ListCandidatesResponse {
  data: Candidate[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ListNotesResponse {
  data: Note[];
  meta: { total: number };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  status?: string;
  stage?: string;
  search?: string;
}