import { EMPTY_FORM, STAGE_OPTIONS, STATUS_OPTIONS } from "@/lib/tracker-config";
import type {
  CandidateFormValues,
  RecordSummary,
  StageOption,
  StatusOption,
  TrackerFilters,
} from "@/types/tracker";

export function buildLabel(
  value: string,
  options: readonly StatusOption[] | readonly StageOption[],
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function buildErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ha ocurrido un error inesperado.";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function normalizeFormValues(record?: RecordSummary | null): CandidateFormValues {
  if (!record) {
    return EMPTY_FORM;
  }

  return {
    full_name: record.full_name,
    email: record.email,
    phone: record.phone,
    position: record.position,
    linkedin_url: record.linkedin_url ?? "",
    cv_url: record.cv_url ?? "",
    experience_years: String(record.experience_years),
  };
}

export function buildTrackerHref(recordId: string | null, filters: TrackerFilters) {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.stage) {
    params.set("stage", filters.stage);
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  const query = params.toString();
  const pathname = recordId ? `/candidates/${recordId}` : "/";

  return query ? `${pathname}?${query}` : pathname;
}

export function buildStatusSuccessMessage(status: string) {
  return `Estado actualizado a ${buildLabel(status, STATUS_OPTIONS)}.`;
}

export function buildStageSuccessMessage(stage: string) {
  return `Etapa actualizada a ${buildLabel(stage, STAGE_OPTIONS)}.`;
}