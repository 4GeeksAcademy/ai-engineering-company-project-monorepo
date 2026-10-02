"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchCandidate } from "@/lib/api";
import Select from "../Select";
import {
  STATUS_OPTIONS,
  STAGE_OPTIONS,
} from "@/lib/candidate-meta";
import type { CandidateStage, CandidateStatus } from "@/lib/types";

interface CandidateUpdateProps {
  candidateId: string;
  initialStatus: CandidateStatus;
  initialStage: CandidateStage;
}

export default function CandidateUpdate({
  candidateId,
  initialStatus,
  initialStage,
}: CandidateUpdateProps) {
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<CandidateStatus>(initialStatus);
  const [stage, setStage] = useState<CandidateStage>(initialStage);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const dirty =
    status !== initialStatus || stage !== initialStage;

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await patchCandidate(candidateId, { status, stage });
      setMessage({ kind: "success", text: "Updated successfully." });
      router.refresh();
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to update candidate.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!expanded) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            setMessage(null);
          }}
          className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          Update status / stage
        </button>
        <p className="mt-2 text-xs text-zinc-400">
          Make manual changes to this candidate&apos;s pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
        <span>Update pipeline</span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-700 hover:underline"
        >
          Hide
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value) => setStatus(value)}
        />

        <Select
          label="Stage"
          options={STAGE_OPTIONS}
          value={stage}
          onChange={(value) => setStage(value)}
        />
      </div>

      <div className="flex flex-col items-start gap-2 border-t border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {message ? (
          <p
            role="status"
            className={
              message.kind === "success"
                ? "text-sm text-emerald-700"
                : "text-sm text-rose-700"
            }
          >
            {message.text}
          </p>
        ) : (
          <p className="text-xs text-zinc-400">
            Manually update this candidate&apos;s status and stage.
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}