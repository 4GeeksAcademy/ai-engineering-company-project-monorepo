import type { CandidateStage, CandidateStatus } from "@/types/candidate";

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  received: "Received",
  in_progress: "In progress",
  selected: "Selected",
  discarded: "Discarded",
};

export const STAGE_LABELS: Record<CandidateStage, string> = {
  pending: "Pending review",
  review: "Under review",
  personal_interview: "Personal interview",
  technical_interview: "Technical interview",
  offer_presented: "Offer presented",
};

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value: value as CandidateStatus,
  label,
}));

export const STAGE_OPTIONS = Object.entries(STAGE_LABELS).map(([value, label]) => ({
  value: value as CandidateStage,
  label,
}));

export function formatStatus(status: CandidateStatus | null | undefined): string {
  if (!status) return "Unknown";
  return STATUS_LABELS[status] ?? status;
}

export function formatStage(stage: CandidateStage | null | undefined): string {
  if (!stage) return "Unknown";
  return STAGE_LABELS[stage] ?? stage;
}

export function formatPosition(position: string | null | undefined): string {
  if (!position) return "Not provided";

  const normalized = position.trim();
  const englishPositions: Record<string, string> = {
    "Asistente Ejecutiva/o": "Executive Assistant",
    "Asistente de Dirección": "Executive Assistant",
    "Auxiliar de Dirección": "Executive Assistant",
    "Coordinadora/or Administrativa/o": "Administrative Coordinator",
    "Executive Assistant": "Executive Assistant",
    "Gerente de Oficina": "Office Manager",
    "Jefa/e de Gabinete": "Executive Assistant",
    "Licenciada/o en Administración de Empresas": "Business Administration Graduate",
    "Office Manager": "Office Manager",
    QA: "QA",
    "Responsable de Administración": "Administrative Manager",
    "Secretaria/o Ejecutiva/o": "Executive Secretary",
    "Técnica/o en Gestión y Organización": "Operations and Organization Technician",
  };

  return englishPositions[normalized] ?? normalized;
}

export function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
