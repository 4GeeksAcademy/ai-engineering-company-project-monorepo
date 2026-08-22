"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Candidate, STATUS_OPTIONS, STAGE_OPTIONS, STATUS_LABELS, STAGE_LABELS } from "@/types/candidate";

export default function StatusStageEditor({
  candidate,
  onUpdated,
}: {
  candidate: Candidate;
  onUpdated: (updated: Candidate) => void;
}) {
  const [status, setStatus] = useState(candidate.status);
  const [stage, setStage] = useState(candidate.stage);
  const [saving, setSaving] = useState<"status" | "stage" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function saveStatus() {
    setSaving("status");
    setFeedback(null);
    try {
      const updated = await api.patchCandidate(candidate.id, { status });
      onUpdated(updated);
      setFeedback("Status updated.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setSaving(null);
    }
  }

  async function saveStage() {
    setSaving("stage");
    setFeedback(null);
    try {
      const updated = await api.patchCandidate(candidate.id, { stage });
      onUpdated(updated);
      setFeedback("Stage updated.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not update stage.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded border border-slate-200 p-3">
      <label className="flex flex-col text-sm">
        Status
        <div className="mt-1 flex gap-2">
          <select
            className="rounded border border-slate-300 px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value as Candidate["status"])}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            onClick={saveStatus}
            disabled={saving === "status"}
            className="rounded bg-brand px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            {saving === "status" ? "Saving..." : "Update"}
          </button>
        </div>
      </label>

      <label className="flex flex-col text-sm">
        Stage
        <div className="mt-1 flex gap-2">
          <select
            className="rounded border border-slate-300 px-2 py-1"
            value={stage}
            onChange={(e) => setStage(e.target.value as Candidate["stage"])}
          >
            {STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            onClick={saveStage}
            disabled={saving === "stage"}
            className="rounded bg-brand px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            {saving === "stage" ? "Saving..." : "Update"}
          </button>
        </div>
      </label>

      {feedback && <p className="text-sm text-slate-600">{feedback}</p>}
    </div>
  );
}
