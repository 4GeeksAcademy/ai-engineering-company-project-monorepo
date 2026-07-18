import type { CandidateStage, CandidateStatus } from "@/types/candidate";

export const statusLabels: Record<CandidateStatus, string> = {
  received: "Received",
  in_progress: "In progress",
  selected: "Selected",
  discarded: "Discarded",
};

export const stageLabels: Record<CandidateStage, string> = {
  pending: "Pending review",
  review: "Under review",
  personal_interview: "Personal interview",
  technical_interview: "Technical interview",
  offer_presented: "Offer presented",
};

export const statusOptions: CandidateStatus[] = ["received", "in_progress", "selected", "discarded"];

export const stageOptions: CandidateStage[] = [
  "pending",
  "review",
  "personal_interview",
  "technical_interview",
  "offer_presented",
];

export function toStatusLabel(value?: CandidateStatus): string {
  if (!value) {
    return "-";
  }

  return statusLabels[value] ?? value;
}

export function toStageLabel(value?: CandidateStage): string {
  if (!value) {
    return "-";
  }

  return stageLabels[value] ?? value;
}
