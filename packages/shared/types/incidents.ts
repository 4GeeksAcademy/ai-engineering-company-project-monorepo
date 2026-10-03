/**
 * Incident domain shared by the backoffice and, through incidents/contract.json,
 * by the Python side (CLI script + API). The rules live in the JSON contract; this
 * file turns them into types, labels and the validations the form runs before
 * calling the API (the API enforces the same rules again).
 */
import contract from "../incidents/contract.json" with { type: "json" };

export type IncidentCategory = "TECHNICAL" | "BILLING" | "ACCESS" | "HR_QUERY" | "COMPLAINT";
export type IncidentStatus = "open" | "in_progress" | "resolved" | "discarded";
export type IncidentOrigin = "customer" | "branch" | "internal";

export const INCIDENT_CATEGORIES = contract.categories as IncidentCategory[];
export const INCIDENT_STATUSES = contract.statuses as IncidentStatus[];
export const INCIDENT_ORIGINS = contract.origins as IncidentOrigin[];
export const DEFAULT_BRANCH = contract.defaultBranch;
export const TRANSITIONS = contract.transitions as Record<IncidentStatus, IncidentStatus[]>;
export const LIMITS = contract.limits;

const AGENT_ID = new RegExp(contract.patterns.agentId);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  TECHNICAL: "Técnica",
  BILLING: "Facturación",
  ACCESS: "Accesos",
  HR_QUERY: "Consulta de RR. HH.",
  COMPLAINT: "Queja",
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Abierta",
  in_progress: "En curso",
  resolved: "Resuelta",
  discarded: "Descartada",
};

export const ORIGIN_LABELS: Record<IncidentOrigin, string> = {
  customer: "Cliente",
  branch: "Sucursal",
  internal: "Interno",
};

export const SCORE_LABELS: Record<number, string> = {
  1: "Muy insatisfecho",
  2: "Insatisfecho",
  3: "Neutral",
  4: "Satisfecho",
  5: "Muy satisfecho",
};

// ---- API shapes (mirror services/api/incidents/incident_schemas.py) ----------------------

export interface HistoryEntry {
  at: string;
  kind: "created" | "imported" | "status_changed" | "edited";
  actor: string;
  from_status: IncidentStatus | null;
  to_status: IncidentStatus | null;
  fields: string[];
  note: string | null;
}

interface IncidentBase {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: string;
  client_company: string | null;
  agent_id: string | null;
  satisfaction_score: number | null;
  discard_reason: string | null;
  created_at: string;
  updated_at: string;
  allowed_transitions: IncidentStatus[];
  editable: boolean;
}

/** A row of the list: the customer's address comes masked. */
export interface IncidentListItem extends IncidentBase {
  customer_email_masked: string | null;
}

export interface Incident extends IncidentBase {
  customer_email: string | null;
  history: HistoryEntry[];
}

export interface IncidentPage {
  items: IncidentListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CountItem {
  name: string;
  count: number;
}

export interface IncidentSummary {
  total: number;
  status_counts: Record<IncidentStatus, number>;
  status_percentages: Record<IncidentStatus, number>;
  category_counts: Record<IncidentCategory, number>;
  category_percentages: Record<IncidentCategory, number>;
  origin_counts: Record<IncidentOrigin, number>;
  /** Per branch (sede), biggest first; `central` is always present. */
  branch_counts: Record<string, number>;
  branch_percentages: Record<string, number>;
  /** open + in_progress, per category: the backlog. */
  active_by_category: Record<IncidentCategory, number>;
  satisfaction_average: number | null;
  satisfaction_scored: number;
  satisfaction_distribution: Record<string, number>;
  top_branches: CountItem[];
  top_clients: CountItem[];
}

export interface IncidentFacets {
  branches: string[];
  clients: string[];
  agents: string[];
}

export interface IncidentFilters {
  status: IncidentStatus[];
  category: IncidentCategory[];
  origin: IncidentOrigin[];
  branch: string;
  agent_id: string;
  client_company: string;
  q: string;
  date_from: string;
  date_to: string;
}

export const EMPTY_FILTERS: IncidentFilters = {
  status: [],
  category: [],
  origin: [],
  branch: "",
  agent_id: "",
  client_company: "",
  q: "",
  date_from: "",
  date_to: "",
};

// ---- Lifecycle ---------------------------------------------------------------------------

export function allowedTransitions(status: IncidentStatus): IncidentStatus[] {
  return TRANSITIONS[status] ?? [];
}

export function isEditable(status: IncidentStatus): boolean {
  return (contract.editableStatuses as string[]).includes(status);
}

// ---- Validation (Spanish messages, same rules as the API) --------------------------------

export interface IncidentDraft {
  title: string;
  description: string;
  category: string;
  origin: string;
  branch: string;
  client_company: string;
  agent_id: string;
  customer_email: string;
}

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export function maskEmail(email: string): string {
  const [local, domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

/** Same rules as the API: required fields, allowed values, and "an incident from a branch names the branch". */
export function validateIncidentDraft(draft: IncidentDraft): FieldErrors<keyof IncidentDraft> {
  const errors: FieldErrors<keyof IncidentDraft> = {};
  const title = draft.title.trim();
  const description = draft.description.trim();
  const branch = draft.branch.trim();
  const company = draft.client_company.trim();
  const agent = draft.agent_id.trim();
  const email = draft.customer_email.trim();

  if (title.length < LIMITS.titleMin) errors.title = `El título debe tener al menos ${LIMITS.titleMin} caracteres.`;
  else if (title.length > LIMITS.titleMax) errors.title = `El título no puede superar los ${LIMITS.titleMax} caracteres.`;
  if (description.length < LIMITS.descriptionMin)
    errors.description = `La descripción debe tener al menos ${LIMITS.descriptionMin} caracteres.`;
  else if (description.length > LIMITS.descriptionMax)
    errors.description = `La descripción no puede superar los ${LIMITS.descriptionMax} caracteres.`;
  if (!(INCIDENT_CATEGORIES as string[]).includes(draft.category)) errors.category = "Selecciona una categoría.";
  if (!(INCIDENT_ORIGINS as string[]).includes(draft.origin)) errors.origin = "Indica el origen de la incidencia.";
  if (!branch) errors.branch = `Indica la sucursal (usa «${DEFAULT_BRANCH}» si no aplica).`;
  else if (branch.length > LIMITS.branchMax) errors.branch = `La sucursal no puede superar los ${LIMITS.branchMax} caracteres.`;
  else if (draft.origin === "branch" && branch.toLowerCase() === DEFAULT_BRANCH)
    errors.branch = `Si viene de una sucursal, indica cuál («${DEFAULT_BRANCH}» es para cuando no aplica).`;
  if (company.length > LIMITS.clientCompanyMax)
    errors.client_company = `La empresa no puede superar los ${LIMITS.clientCompanyMax} caracteres.`;
  if (agent && !AGENT_ID.test(agent)) errors.agent_id = "El agente debe tener el formato AGT-07.";
  if (email && !EMAIL.test(email)) errors.customer_email = "Indica un email válido (ejemplo: cliente@empresa.com).";
  return errors;
}

export interface StatusChangeInput {
  status: IncidentStatus;
  satisfaction_score?: number | null;
  discard_reason?: string | null;
}

/** Checks a lifecycle move against `current`; errors are keyed by the field to fix, or `status`. */
export function validateStatusChange(
  current: IncidentStatus,
  change: StatusChangeInput,
): FieldErrors<"status" | "satisfaction_score" | "discard_reason"> {
  const errors: FieldErrors<"status" | "satisfaction_score" | "discard_reason"> = {};
  if (!allowedTransitions(current).includes(change.status)) {
    errors.status =
      allowedTransitions(current).length === 0
        ? `La incidencia está ${STATUS_LABELS[current].toLowerCase()}: es un estado final y no puede cambiar.`
        : current === change.status
          ? `La incidencia ya está ${STATUS_LABELS[current].toLowerCase()}.`
          : `No se puede pasar de ${STATUS_LABELS[current]} a ${STATUS_LABELS[change.status]}.`;
    return errors;
  }
  const score = change.satisfaction_score;
  if (score != null) {
    if (change.status !== "resolved") errors.satisfaction_score = "La satisfacción solo se indica al resolver.";
    else if (!Number.isInteger(score) || score < LIMITS.scoreMin || score > LIMITS.scoreMax)
      errors.satisfaction_score = `La satisfacción debe estar entre ${LIMITS.scoreMin} y ${LIMITS.scoreMax}.`;
  }
  const reason = (change.discard_reason ?? "").trim();
  if (reason) {
    if (change.status !== "discarded") errors.discard_reason = "El motivo solo se indica al descartar.";
    else if (reason.length < LIMITS.discardReasonMin)
      errors.discard_reason = `El motivo debe tener al menos ${LIMITS.discardReasonMin} caracteres (o déjalo vacío).`;
    else if (reason.length > LIMITS.discardReasonMax)
      errors.discard_reason = `El motivo no puede superar los ${LIMITS.discardReasonMax} caracteres.`;
  }
  return errors;
}
