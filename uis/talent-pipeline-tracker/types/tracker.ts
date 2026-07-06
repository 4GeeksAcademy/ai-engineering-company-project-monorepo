export type StatusOption = {
  value: string;
  label: string;
};

export type StageOption = {
  value: string;
  label: string;
};

export type Note = {
  id: string;
  record_id: string;
  content: string;
  created_at: string;
};

export type RecordSummary = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  status: string;
  stage: string;
  experience_years: number;
  notes_count: number;
  applied_at: string;
  updated_at: string;
};

export type RecordListItem = RecordSummary & {
  notes?: Note[];
};

export type RecordsResponse = {
  total: number;
  page: number;
  limit: number;
  data: RecordListItem[];
};

export type NotesResponse = {
  data: Note[];
  meta: {
    total: number;
  };
};

export type CandidateFormValues = {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  experience_years: string;
};

export type FormMode =
  | { type: "create" }
  | { type: "edit"; recordId: string };

export type AsyncFeedback = {
  tone: "loading" | "success" | "error";
  message: string;
};

export type TrackerFilters = {
  status: string;
  stage: string;
  search: string;
};