"use client";

import { useState } from "react";
import { patchRecord } from "@/lib/api";
import { STATUS_OPTIONS } from "@/lib/constants";
import type { RecordOut, Status } from "@/types";

export default function StatusSelect({
  candidate,
  onUpdated,
}: {
  candidate: RecordOut;
  onUpdated: (record: RecordOut) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (status: Status) => {
    if (status === candidate.status) return;
    setIsUpdating(true);
    setError(null);
    try {
      const updated = await patchRecord(candidate.id, { status });
      onUpdated(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el estado.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <label
        htmlFor="status-select"
        className="mb-1 block text-sm font-medium text-stone-700"
      >
        Estado
      </label>
      <select
        id="status-select"
        value={candidate.status}
        disabled={isUpdating}
        onChange={(e) => void handleChange(e.target.value as Status)}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none ring-orange-500 focus:ring-2 disabled:opacity-60"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isUpdating && (
        <p className="mt-1 text-xs text-stone-500">Actualizando estado...</p>
      )}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
