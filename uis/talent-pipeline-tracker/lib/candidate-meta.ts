import type {
  CandidateStage,
  CandidateStatus,
} from "./types";

export const CANDIDATE_STATUSES: CandidateStatus[] = [
  "received",
  "in_progress",
  "selected",
  "discarded",
];

export const CANDIDATE_STAGES: CandidateStage[] = [
  "pending",
  "review",
  "personal_interview",
  "technical_interview",
  "offer_presented",
];

export const STATUS_OPTIONS: { value: CandidateStatus; label: string }[] = [
  { value: "received", label: "Received" },
  { value: "in_progress", label: "In progress" },
  { value: "selected", label: "Selected" },
  { value: "discarded", label: "Discarded" },
];

export const STAGE_OPTIONS: { value: CandidateStage; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "review", label: "Review" },
  { value: "personal_interview", label: "Personal interview" },
  { value: "technical_interview", label: "Technical interview" },
  { value: "offer_presented", label: "Offer presented" },
];

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  received: "Received",
  in_progress: "In progress",
  selected: "Selected",
  discarded: "Discarded",
};

// Short badge labels (siglas) for wide values
export const STATUS_SHORT: Record<CandidateStatus, string> = {
  received: "Rec.",
  in_progress: "In prog.",
  selected: "Sel.",
  discarded: "Disc.",
};

export const STAGE_LABELS: Record<CandidateStage, string> = {
  pending: "Pending",
  review: "Review",
  personal_interview: "Personal interview",
  technical_interview: "Technical interview",
  offer_presented: "Offer presented",
};

// Short badge labels (siglas) for wide values
export const STAGE_SHORT: Record<CandidateStage, string> = {
  pending: "Pend.",
  review: "Review",
  personal_interview: "Pers. view",
  technical_interview: "Tech. view",
  offer_presented: "Offer",
};

export const STATUS_STYLES: Record<CandidateStatus, string> = {
  received: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  selected: "bg-emerald-100 text-emerald-700",
  discarded: "bg-rose-100 text-rose-700",
};

export const STAGE_STYLES: Record<CandidateStage, string> = {
  pending: "bg-zinc-100 text-zinc-600",
  review: "bg-indigo-100 text-indigo-700",
  personal_interview: "bg-violet-100 text-violet-700",
  technical_interview: "bg-fuchsia-100 text-fuchsia-700",
  offer_presented: "bg-teal-100 text-teal-700",
};

export function isCandidateStatus(value: unknown): value is CandidateStatus {
  return CANDIDATE_STATUSES.includes(value as CandidateStatus);
}

export function isCandidateStage(value: unknown): value is CandidateStage {
  return CANDIDATE_STAGES.includes(value as CandidateStage);
}