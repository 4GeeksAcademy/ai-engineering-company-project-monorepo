/**
 * Color maps for status and stage values in the Talent Pipeline Tracker.
 * Used by CandidateRow badges and detail page select dropdowns.
 */

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  received: { bg: "#f3f4f6", text: "#374151" },
  in_progress: { bg: "#dbeafe", text: "#1e40af" },
  selected: { bg: "#d1fae5", text: "#065f46" },
  discarded: { bg: "#fee2e2", text: "#991b1b" },
};

export const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#fef3c7", text: "#92400e" },
  review: { bg: "#e0e7ff", text: "#3730a3" },
  personal_interview: { bg: "#fce7f3", text: "#9d174d" },
  technical_interview: { bg: "#e0f4ff", text: "#0369a1" },
  offer_presented: { bg: "#d1fae5", text: "#065f46" },
};

/** Look up the color for a status value, falling back to neutral gray. */
export function getStatusColor(value: string) {
  return STATUS_COLORS[value] ?? { bg: "#f3f4f6", text: "#374151" };
}

/** Look up the color for a stage value, falling back to neutral gray. */
export function getStageColor(value: string) {
  return STAGE_COLORS[value] ?? { bg: "#f3f4f6", text: "#374151" };
}