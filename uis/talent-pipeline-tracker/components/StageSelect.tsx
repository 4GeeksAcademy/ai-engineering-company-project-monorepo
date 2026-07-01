"use client";

import { useState } from "react";
import { patchRecord } from "@/lib/api";
import { STAGE_OPTIONS } from "@/lib/constants";
import type { RecordOut, Stage } from "@/types";

export default function StageSelect({
  candidate,
  onUpdated,
}: {
  candidate: RecordOut;
  onUpdated: (record: RecordOut) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (stage: Stage) => {
    if (stage === candidate.stage) return;
    setIsUpdating(true);
    setError(null);
    try {
      const updated = await patchRecord(candidate.id, { stage });
      onUpdated(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar la etapa.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <label
        htmlFor="stage-select"
        className="mb-1 block text-sm font-medium text-stone-700"
      >
        Etapa
      </label>
      <select
        id="stage-select"
        value={candidate.stage}
        disabled={isUpdating}
        onChange={(e) => void handleChange(e.target.value as Stage)}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none ring-orange-500 focus:ring-2 disabled:opacity-60"
      >
        {STAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isUpdating && (
        <p className="mt-1 text-xs text-stone-500">Actualizando etapa...</p>
      )}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
