// Run with: npm test  (node's built-in runner; Node 22.18+ runs .ts natively)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BRANCH_LABELS,
  INCIDENT_BRANCHES,
  INCIDENT_CATEGORIES,
  INCIDENT_ORIGINS,
  INCIDENT_STATUSES,
  allowedTransitions,
  isEditable,
  maskEmail,
  validateIncidentDraft,
  validateStatusChange,
} from "../types/incidents.ts";

const valid = {
  title: "VPN se cae",
  description: "La VPN se cae cada diez minutos",
  category: "technical_failure",
  origin: "customer",
  branch: "central",
  client_company: "",
  agent_id: "",
  customer_email: "",
};

test("categories, offices, statuses and origins are the ones in the shared contract (and the CONTEXT)", () => {
  const contract = JSON.parse(readFileSync(new URL("../incidents/contract.json", import.meta.url), "utf8"));
  assert.deepEqual(INCIDENT_CATEGORIES, contract.categories);
  assert.deepEqual(INCIDENT_CATEGORIES, [
    "technical_failure", "process_error", "client_complaint", "candidate_issue",
    "staff_issue", "sla_breach", "data_quality", "other",
  ]);
  assert.deepEqual(INCIDENT_BRANCHES, ["central", "valencia_operations", "miami_office", "remote"]);
  assert.deepEqual(BRANCH_LABELS, {
    central: "Central — Sede Valencia",
    valencia_operations: "Valencia — Operaciones",
    miami_office: "Miami Office",
    remote: "Remoto (empleado sin sede fija)",
  });
  assert.deepEqual(INCIDENT_STATUSES, ["open", "in_progress", "resolved", "discarded"]);
  assert.deepEqual(INCIDENT_STATUSES, contract.statuses);
  assert.deepEqual(INCIDENT_ORIGINS, ["customer", "branch", "internal"]);
});

test("a draft with only the required fields is valid", () => {
  assert.deepEqual(validateIncidentDraft(valid), {});
});

test("each required field is reported on its own", () => {
  const errors = validateIncidentDraft({ ...valid, title: " ", description: "abc", category: "", origin: "", branch: " " });
  assert.deepEqual(Object.keys(errors).sort(), ["branch", "category", "description", "origin", "title"]);
});

test("optional fields are only checked when filled in", () => {
  const errors = validateIncidentDraft({ ...valid, agent_id: "AGT-7", customer_email: "nope" });
  assert.deepEqual(Object.keys(errors).sort(), ["agent_id", "customer_email"]);
  assert.deepEqual(validateIncidentDraft({ ...valid, agent_id: "AGT-07", customer_email: "a@b.co" }), {});
});

test("the branch is exactly one of the four offices; central is a real office for any origin", () => {
  for (const branch of INCIDENT_BRANCHES) assert.deepEqual(validateIncidentDraft({ ...valid, branch }), {});
  for (const origin of ["customer", "branch", "internal"]) {
    assert.deepEqual(validateIncidentDraft({ ...valid, origin, branch: "central" }), {});
  }
  for (const branch of ["Central", "Valencia", "valencia", "miami", " remote", "hq"]) {
    assert.ok(validateIncidentDraft({ ...valid, branch }).branch, branch);
  }
});

test("only the categories of the CONTEXT are valid (not the CSV ones)", () => {
  for (const category of INCIDENT_CATEGORIES) assert.deepEqual(validateIncidentDraft({ ...valid, category }), {});
  for (const category of ["TECHNICAL", "BILLING", "technical", "spam", ""]) {
    assert.ok(validateIncidentDraft({ ...valid, category }).category, category);
  }
});

test("lifecycle table: resolved and discarded are final", () => {
  assert.deepEqual(allowedTransitions("open"), ["in_progress", "discarded"]);
  assert.deepEqual(allowedTransitions("in_progress"), ["resolved", "discarded"]);
  assert.deepEqual(allowedTransitions("resolved"), []);
  assert.deepEqual(allowedTransitions("discarded"), []);
  assert.equal(isEditable("open"), true);
  assert.equal(isEditable("in_progress"), true);
  assert.equal(isEditable("resolved"), false);
  assert.equal(isEditable("discarded"), false);
});

test("every pair of statuses is checked against the table", () => {
  const valid: Record<string, string[]> = { open: ["in_progress", "discarded"], in_progress: ["resolved", "discarded"], resolved: [], discarded: [] };
  for (const from of INCIDENT_STATUSES) {
    for (const to of INCIDENT_STATUSES) {
      const errors = validateStatusChange(from, { status: to });
      assert.equal(!errors.status, valid[from].includes(to), `${from} -> ${to}`);
    }
  }
});

test("resolving: the score is optional but 1-5; discarding: the reason is optional but 5+ chars; each only where it applies", () => {
  assert.deepEqual(validateStatusChange("in_progress", { status: "resolved" }), {});
  assert.deepEqual(validateStatusChange("in_progress", { status: "resolved", satisfaction_score: 4 }), {});
  assert.ok(validateStatusChange("in_progress", { status: "resolved", satisfaction_score: 6 }).satisfaction_score);
  assert.ok(validateStatusChange("open", { status: "in_progress", satisfaction_score: 3 }).satisfaction_score);
  assert.deepEqual(validateStatusChange("open", { status: "discarded" }), {});
  assert.deepEqual(validateStatusChange("open", { status: "discarded", discard_reason: "   " }), {});
  assert.ok(validateStatusChange("open", { status: "discarded", discard_reason: "ok" }).discard_reason);
  assert.deepEqual(validateStatusChange("open", { status: "discarded", discard_reason: "Duplicado de otra" }), {});
  assert.ok(validateStatusChange("open", { status: "in_progress", discard_reason: "motivo largo" }).discard_reason);
});

test("forbidden moves are reported on status; a final status says so", () => {
  assert.ok(validateStatusChange("open", { status: "resolved" }).status);
  assert.ok(validateStatusChange("in_progress", { status: "open" }).status);
  assert.match(validateStatusChange("resolved", { status: "open" }).status ?? "", /estado final/);
  assert.match(validateStatusChange("discarded", { status: "in_progress" }).status ?? "", /estado final/);
  assert.match(validateStatusChange("open", { status: "open" }).status ?? "", /ya está/);
});

test("emails are masked", () => {
  assert.equal(maskEmail("elena.smith13@icloud.com"), "e***@icloud.com");
});
