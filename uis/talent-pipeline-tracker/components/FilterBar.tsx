"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATUS_OPTIONS, STAGE_OPTIONS, STATUS_LABELS, STAGE_LABELS } from "@/types/candidate";

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const stage = searchParams.get("stage") ?? "";

  function updateParam(key: "status" | "stage", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col text-sm text-slate-600">
        Status
        <select
          value={status}
          onChange={(e) => updateParam("status", e.target.value)}
          className="mt-1 rounded border border-slate-300 px-2 py-1"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-sm text-slate-600">
        Stage
        <select
          value={stage}
          onChange={(e) => updateParam("stage", e.target.value)}
          className="mt-1 rounded border border-slate-300 px-2 py-1"
        >
          <option value="">All stages</option>
          {STAGE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
