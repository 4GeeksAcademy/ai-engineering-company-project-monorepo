// Run with: npm test  (node's built-in runner; Node 22.18+ runs .ts natively)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
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
  category: "TECHNICAL",
  origin: "customer",
  branch: "central",
  client_company: "",
  agent_id: "",
  customer_email: "",
};

test("categories, statuses and origins are the ones in the shared contract", () => {
  const contract = JSON.parse(readFileSync(new URL("../incidents/contract.json", import.meta.url), "utf8"));
  assert.deepEqual(INCIDENT_CATEGORIES, contract.categories);
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

test("an incident from a branch must name it; central is for when it does not apply", () => {
  assert.ok(validateIncidentDraft({ ...valid, origin: "branch", branch: "Central" }).branch);
  assert.deepEqual(validateIncidentDraft({ ...valid, origin: "branch", branch: "Valencia" }), {});
  assert.deepEqual(validateIncidentDraft({ ...valid, origin: "internal", branch: "central" }), {});
});

test("lifecycle table", () => {
  assert.deepEqual(allowedTransitions("open"), ["in_progress", "discarded"]);
  assert.deepEqual(allowedTransitions("in_progress"), ["resolved", "open", "discarded"]);
  assert.deepEqual(allowedTransitions("resolved"), ["open"]);
  assert.deepEqual(allowedTransitions("discarded"), ["open"]);
  assert.equal(isEditable("open"), true);
  assert.equal(isEditable("in_progress"), true);
  assert.equal(isEditable("resolved"), false);
});

test("resolving: score is optional but 1-5; discarding needs a reason; each only where it applies", () => {
  assert.deepEqual(validateStatusChange("in_progress", { status: "resolved" }), {});
  assert.deepEqual(validateStatusChange("in_progress", { status: "resolved", satisfaction_score: 4 }), {});
  assert.ok(validateStatusChange("in_progress", { status: "resolved", satisfaction_score: 6 }).satisfaction_score);
  assert.ok(validateStatusChange("open", { status: "in_progress", satisfaction_score: 3 }).satisfaction_score);
  assert.ok(validateStatusChange("open", { status: "discarded", discard_reason: "ok" }).discard_reason);
  assert.deepEqual(validateStatusChange("open", { status: "discarded", discard_reason: "Duplicado de otra" }), {});
  assert.ok(validateStatusChange("open", { status: "in_progress", discard_reason: "motivo largo" }).discard_reason);
});

test("forbidden moves are reported on status", () => {
  assert.ok(validateStatusChange("open", { status: "resolved" }).status);
  assert.ok(validateStatusChange("resolved", { status: "discarded", discard_reason: "motivo largo" }).status);
  assert.match(validateStatusChange("open", { status: "open" }).status ?? "", /ya está/);
});

test("emails are masked", () => {
  assert.equal(maskEmail("elena.smith13@icloud.com"), "e***@icloud.com");
});
