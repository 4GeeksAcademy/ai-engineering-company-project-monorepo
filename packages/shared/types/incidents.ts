/**
 * Incident domain shared by the backoffice and, through incidents/contract.json,
 * by the Python side (CLI script + API). The rules live in the JSON contract; this
 * file turns them into types, labels and the validations the form runs before
 * calling the API (the API enforces the same rules again).
 */
import contract from "../incidents/contract.json" with { type: "json" };

export type IncidentCategory =
  | "technical_failure"
  | "process_error"
  | "client_complaint"
  | "candidate_issue"
  | "staff_issue"
  | "sla_breach"
  | "data_quality"
  | "other";
export type IncidentStatus = "open" | "in_progress" | "resolved" | "discarded";
export type IncidentOrigin = "customer" | "branch" | "internal";
export type IncidentBranch = "central" | "valencia_operations" | "miami_office" | "remote";

export const INCIDENT_CATEGORIES = contract.categories as IncidentCategory[];
export const INCIDENT_STATUSES = contract.statuses as IncidentStatus[];
export const INCIDENT_ORIGINS = contract.origins as IncidentOrigin[];
export const INCIDENT_BRANCHES = contract.branches.map((b) => b.value) as IncidentBranch[];
export const DEFAULT_BRANCH = contract.defaultBranch as IncidentBranch;
/** Display name of each office, as in the CONTEXT ("Central — Sede Valencia"…). */
export const BRANCH_LABELS = Object.fromEntries(contract.branches.map((b) => [b.value, b.label])) as Record<IncidentBranch, string>;
export const TRANSITIONS = contract.transitions as Record<IncidentStatus, IncidentStatus[]>;
export const LIMITS = contract.limits;

const AGENT_ID = new RegExp(contract.patterns.agentId);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  technical_failure: "Fallo técnico",
  process_error: "Error de proceso",
  client_complaint: "Queja de cliente",
  candidate_issue: "Problema de candidato",
  staff_issue: "Incidencia de personal",
  sla_breach: "Incumplimiento de SLA",
  data_quality: "Calidad de datos",
  other: "Otra",
};

/** What each category covers (CONTEXT), shown as help in the form. */
export const CATEGORY_HELP: Record<IncidentCategory, string> = {
  technical_failure: "Fallo de un sistema o herramienta (ATS, HubSpot, Zendesk, infraestructura).",
  process_error: "Error en un proceso operativo: selección, incorporación, formación, facturación.",
  client_complaint: "Queja o reclamación de un cliente corporativo sobre el servicio.",
  candidate_issue: "Problema reportado por o relacionado con un candidato en proceso.",
  staff_issue: "Incidencia interna de RR. HH.: ausencia, conflicto, accidente, baja.",
  sla_breach: "Incumplimiento de un SLA comprometido con un cliente.",
  data_quality: "Error o inconsistencia en datos de candidatos, clientes o reportes.",
  other: "Cualquier incidencia que no encaje en las anteriores.",
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Abierta",
  in_progress: "En curso",
  resolved: "Resuelta",
  discarded: "Descartada",
};

export const ORIGIN_LABELS: Record<IncidentOrigin, string> = {
  customer: "Cliente",
  branch: "Personal de oficina",
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
  branch: IncidentBranch;
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
  /** Per office (sede): the four, always present, in the order of the CONTEXT. */
  branch_counts: Record<IncidentBranch, number>;
  branch_percentages: Record<IncidentBranch, number>;
  /** open + in_progress, per category: the backlog. */
  active_by_category: Record<IncidentCategory, number>;
  satisfaction_average: number | null;
  satisfaction_scored: number;
  satisfaction_distribution: Record<string, number>;
  top_branches: CountItem[];
  top_clients: CountItem[];
}

export interface IncidentFacets {
  branches: IncidentBranch[];
  clients: string[];
  agents: string[];
}

export interface IncidentFilters {
  status: IncidentStatus[];
  category: IncidentCategory[];
  origin: IncidentOrigin[];
  branch: IncidentBranch | "";
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

/** Same rules as the API: required fields and exactly the values the CONTEXT allows. */
export function validateIncidentDraft(draft: IncidentDraft): FieldErrors<keyof IncidentDraft> {
  const errors: FieldErrors<keyof IncidentDraft> = {};
  const title = draft.title.trim();
  const description = draft.description.trim();
  const branch = draft.branch;
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
  if (!(INCIDENT_BRANCHES as string[]).includes(branch)) errors.branch = "Selecciona la sede de la incidencia («Central» si no corresponde a una oficina concreta).";
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
