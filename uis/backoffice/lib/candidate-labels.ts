import type { CandidateStage, CandidateStatus } from "@/types/models";

const STATUS_LABELS: Record<CandidateStatus, string> = {
  received: "Recibida",
  in_progress: "En proceso",
  selected: "Seleccionada",
  discarded: "Descartada",
};

const STAGE_LABELS: Record<CandidateStage, string> = {
  pending: "Pendiente de revisión",
  review: "En revisión",
  personal_interview: "Entrevista personal",
  technical_interview: "Entrevista técnica",
  offer_presented: "Oferta presentada",
};

export function getStatusLabel(status: CandidateStatus): string {
  return STATUS_LABELS[status];
}

export function getStageLabel(stage: CandidateStage): string {
  return STAGE_LABELS[stage];
}
