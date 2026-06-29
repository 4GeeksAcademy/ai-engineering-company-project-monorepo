import type { CandidateStage, CandidateStatus } from "./types";

export const CANDIDATE_STATUS_VALUES: CandidateStatus[] = [
  "received",
  "in_progress",
  "selected",
  "discarded",
];

export const CANDIDATE_STAGE_VALUES: CandidateStage[] = [
  "pending",
  "review",
  "personal_interview",
  "technical_interview",
  "offer_presented",
];

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  received: "Recibida",
  in_progress: "En Progreso",
  selected: "Seleccionado",
  discarded: "Descartado",
};

export const STAGE_LABELS: Record<CandidateStage, string> = {
  pending: "Pendiente",
  review: "Revisión",
  personal_interview: "Entrevista Personal",
  technical_interview: "Entrevista Técnica",
  offer_presented: "Ofertado",
};

export const STATUS_COLORS: Record<CandidateStatus, string> = {
  received: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  in_progress: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  selected: "bg-green-500/20 text-green-300 border-green-500/40",
  discarded: "bg-red-500/20 text-red-300 border-red-500/40",
};

export const STAGE_COLORS: Record<CandidateStage, string> = {
  pending: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  review: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  personal_interview: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  technical_interview: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  offer_presented: "bg-green-500/20 text-green-300 border-green-500/40",
};
