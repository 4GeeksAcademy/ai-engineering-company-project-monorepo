export type Status = "received" | "in_progress" | "selected" | "discarded";

export type Stage =
  | "pending"
  | "review"
  | "personal_interview"
  | "technical_interview"
  | "offer_presented";

export interface Note {
  id: string;
  record_id: string;
  content: string;
  created_at: string;
}

export interface RecordOut {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  status: Status;
  stage: Stage;
  experience_years: number;
  notes_count: number;
  applied_at: string;
  updated_at: string;
  notes?: Note[];
}

export interface RecordCreate {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url?: string | null;
  cv_url?: string | null;
  experience_years: number;
}

export interface RecordPatch {
  status?: Status | null;
  stage?: Stage | null;
}

export interface PaginatedRecords {
  total: number;
  page: number;
  limit: number;
  data: RecordOut[];
}

export interface RecordsQueryParams {
  status?: Status;
  stage?: Stage;
  search?: string;
  page?: number;
  limit?: number;
}

export interface NoteCreate {
  content: string;
}

export interface ApiValidationError {
  detail?: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}
