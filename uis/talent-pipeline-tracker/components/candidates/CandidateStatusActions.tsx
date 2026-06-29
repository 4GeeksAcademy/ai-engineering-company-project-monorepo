"use client";

import { useState } from "react";
import type { CandidatePatch, CandidateStatus, CandidateStage } from "@/lib/types";
import {
  CANDIDATE_STATUS_VALUES,
  CANDIDATE_STAGE_VALUES,
  STATUS_LABELS,
  STAGE_LABELS,
} from "@/lib/constants";
import { patchRecord } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StageBadge } from "@/components/ui/StageBadge";

interface CandidateStatusActionsProps {
  recordId: string;
  currentStatus: CandidateStatus;
  currentStage: CandidateStage;
  onUpdated: (patch: CandidatePatch) => void;
}

export function CandidateStatusActions({
  recordId,
  currentStatus,
  currentStage,
  onUpdated,
}: CandidateStatusActionsProps) {
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [stage, setStage] = useState(currentStage);

  const handleStatusChange = async (newStatus: string) => {
    const value = newStatus as CandidateStatus;
    setUpdating(true);
    try {
      await patchRecord(recordId, { status: value });
      setStatus(value);
      onUpdated({ status: value });
    } catch {
      setStatus(currentStatus);
    } finally {
      setUpdating(false);
    }
  };

  const handleStageChange = async (newStage: string) => {
    const value = newStage as CandidateStage;
    setUpdating(true);
    try {
      await patchRecord(recordId, { stage: value });
      setStage(value);
      onUpdated({ stage: value });
    } catch {
      setStage(currentStage);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={`space-y-4 ${updating ? "opacity-50 pointer-events-none" : ""}`}>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">
          Estado
        </label>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-white/10 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-400"
          >
            {CANDIDATE_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">
          Etapa
        </label>
        <div className="flex items-center gap-3">
          <StageBadge stage={stage} />
          <select
            value={stage}
            onChange={(e) => handleStageChange(e.target.value)}
            className="rounded-md border border-white/10 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-400"
          >
            {CANDIDATE_STAGE_VALUES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
