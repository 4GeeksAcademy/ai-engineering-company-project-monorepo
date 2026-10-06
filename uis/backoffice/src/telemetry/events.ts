/**
 * Typed callers for `track()`. They do not fetch.
 * Property keys are the Phase 1 allowlists. Envelope fields stay inside TelemetryService.
 */

import {
  bindStaffSession,
  endStaffSession,
  telemetrySessionId,
  track,
  type TelemetryProperties,
} from "../services/telemetry";

export { bindStaffSession, endStaffSession };

const SECTION_META = {
  login: { path: "/login", required: false, ready: true },
  register: { path: "/register", required: false, ready: true },
  accessible_entry: { path: "/accessible", required: true, ready: true },
  location_roster: { path: "/accessible", required: true, ready: true },
  kitchen_inventory: { path: "/accessible", required: true, ready: true },
  executive_sales: { path: "/accessible", required: true, ready: false },
  account_profile: { path: "/account/profile", required: false, ready: true },
  account_password: { path: "/account/change-password", required: false, ready: true },
} as const;

export type SectionId = keyof typeof SECTION_META;

const sectionSeen = new Set<string>();

export function safePath(pathname: string): string {
  const bare = pathname.split("?")[0]?.split("#")[0] ?? "/";
  return bare.startsWith("/") ? bare : "/accessible";
}

export function safeErrorName(error: unknown): string {
  const raw = error instanceof Error ? error.name : "";
  return /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(raw) ? raw : "Error";
}

function localDay(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** One emit per section per session per local day. Re-emit when `ready` flips. */
export function trackSection(section: SectionId, ready = SECTION_META[section].ready): void {
  const meta = SECTION_META[section];
  const key = `${telemetrySessionId() ?? "none"}|${section}|${String(ready)}|${localDay()}`;
  if (sectionSeen.has(key)) {
    return;
  }
  sectionSeen.add(key);
  track("section_viewed", {
    location_scope: "none",
    app: "backoffice",
    section,
    required: meta.required,
    ready,
    path: meta.path,
  });
}

type FlowId =
  | "staff_sign_in"
  | "staff_register"
  | "session_restore"
  | "profile_edit"
  | "password_change"
  | "operations_review";

type OpenFlow = { instance: string; steps: Set<string> };

const openFlows = new Map<FlowId, OpenFlow>();

function flowInstance(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-000000000000";
}

function emitFlow(flowId: FlowId, instance: string, step: string, outcome: string): void {
  track("flow_step_recorded", {
    location_scope: "none",
    flow_id: flowId,
    flow_instance: instance,
    step,
    outcome,
  });
}

export function flowStart(flowId: FlowId, step: string): void {
  if (openFlows.has(flowId)) {
    return;
  }
  const instance = flowInstance();
  openFlows.set(flowId, { instance, steps: new Set([step]) });
  emitFlow(flowId, instance, step, "started");
}

export function flowAdvance(flowId: FlowId, step: string): void {
  const flow = openFlows.get(flowId);
  if (!flow || flow.steps.has(step)) {
    return;
  }
  flow.steps.add(step);
  emitFlow(flowId, flow.instance, step, "advanced");
}

export function flowComplete(flowId: FlowId, step: string): void {
  const flow = openFlows.get(flowId);
  if (!flow) {
    return;
  }
  openFlows.delete(flowId);
  emitFlow(flowId, flow.instance, step, "completed");
}

/** Drop a flow opened by a Strict Mode remount without emitting `abandoned`. */
export function flowDrop(flowId: FlowId): void {
  openFlows.delete(flowId);
}

export function flowAbandon(flowId: FlowId, step: string): void {
  const flow = openFlows.get(flowId);
  if (!flow) {
    return;
  }
  openFlows.delete(flowId);
  emitFlow(flowId, flow.instance, step, "abandoned");
}

export function trackAuthFormRejected(
  form: "login" | "register" | "password_change" | "profile",
  reason: "validation" | "mismatch" | "too_short",
  field: "email" | "password" | "confirm_password" | "name" | "phone" | "address" | "form",
): void {
  track("auth_form_rejected", {
    location_scope: "none",
    form,
    reason,
    field,
  });
}

export function trackAccountUpdated(
  action: "register" | "profile_save" | "password_change",
  outcome: "completed" | "rejected",
  reason: "none" | "validation" | "duplicate_email" | "unauthorized" | "api_error",
): void {
  const safeReason = outcome === "completed" ? "none" : reason === "none" ? "api_error" : reason;
  track("account_updated", {
    location_scope: "none",
    action,
    outcome,
    reason: safeReason,
  });
}

export function trackUiLatency(
  kind: "session_check" | "panel" | "form",
  name:
    | "auth_me"
    | "locations_overview"
    | "inventory"
    | "profile"
    | "login_form"
    | "register_form"
    | "password_form",
  outcome: "success" | "error" | "cancelled",
  durationMs: number,
): void {
  if (outcome === "cancelled" && durationMs < 30) {
    return;
  }
  track("ui_latency_recorded", {
    location_scope: "none",
    kind,
    name,
    duration_ms: Math.max(0, Math.min(3_600_000, Math.round(durationMs))),
    outcome,
  });
}

const exceptionSeen = new Map<string, number>();

export function trackClientException(
  catchSite: "error_boundary" | "window_error" | "unhandled_rejection",
  error: unknown,
): void {
  const path = safePath(typeof window === "undefined" ? "/accessible" : window.location.pathname);
  const errorName = safeErrorName(error);
  const key = `${telemetrySessionId() ?? "none"}|backoffice|${path}|${errorName}|${catchSite}`;
  const now = Date.now();
  const previous = exceptionSeen.get(key) ?? 0;
  if (now - previous < 5 * 60 * 1000) {
    return;
  }
  exceptionSeen.set(key, now);
  track("client_exception_caught", {
    location_scope: "none",
    catch_site: catchSite,
    app: "backoffice",
    path,
    error_name: errorName,
  });
}

export function trackLoginSucceeded(): void {
  track("user_login_succeeded", {
    location_scope: "none",
    method: "json",
    route: "/auth/login",
  });
}

export function trackLoginFailed(): void {
  track("user_login_failed", {
    location_scope: "none",
    method: "json",
    route: "/auth/login",
    failure_reason: "invalid_credentials",
  });
}

export function trackSessionExpired(routeTemplate: string): void {
  if (!/^\/[A-Za-z0-9_./{}-]+$/.test(routeTemplate)) {
    return;
  }
  track("session_expired", {
    location_scope: "none",
    route_template: routeTemplate,
  });
}

const missingTokenSeen = new Set<string>();

export function trackMissingToken(pathname: string): void {
  const path = safePath(pathname);
  const key = `${path}|${localDay()}`;
  if (missingTokenSeen.has(key)) {
    return;
  }
  missingTokenSeen.add(key);
  track("session_rejected", {
    location_scope: "none",
    reason: "missing_token",
    path,
  });
}

export function trackApiLatency(properties: TelemetryProperties): void {
  track("api_latency_recorded", properties);
}

type ValidationField = { loc: string; error_type: string };

export function validationFields(details: unknown): ValidationField[] {
  if (!Array.isArray(details)) {
    return [];
  }
  const fields: ValidationField[] = [];
  for (const item of details) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as { loc?: unknown; type?: unknown };
    const loc = Array.isArray(record.loc)
      ? record.loc.filter((part) => typeof part === "string" || typeof part === "number").join(".")
      : "";
    const errorType = typeof record.type === "string" ? record.type : "";
    if (!/^[A-Za-z0-9_.]+$/.test(loc) || errorType.length === 0 || errorType.length > 64) {
      continue;
    }
    fields.push({ loc, error_type: errorType });
    if (fields.length >= 20) {
      break;
    }
  }
  return fields;
}
