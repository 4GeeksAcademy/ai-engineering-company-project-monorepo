"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { stageLabels, stageOptions, statusLabels, statusOptions } from "@/lib/labels";
import type { CandidateStage, CandidateStatus } from "@/types/candidate";

interface CandidateFiltersProps {
  status: CandidateStatus | "";
  stage: CandidateStage | "";
  search: string;
  onSearchChange: (value: string) => void;
}

export function CandidateFilters({ status, stage, search, onSearchChange }: CandidateFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = (key: "status" | "stage", value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    params.delete("page");

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span className="font-medium">Filter by status</span>
          <select
            value={status}
            onChange={(event) => setParam("status", event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-500 focus:ring"
          >
            <option value="">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {statusLabels[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span className="font-medium">Filter by stage</span>
          <select
            value={stage}
            onChange={(event) => setParam("stage", event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-500 focus:ring"
          >
            <option value="">All stages</option>
            {stageOptions.map((option) => (
              <option key={option} value={option}>
                {stageLabels[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span className="font-medium">Search by name or email</span>
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="e.g. Maria or maria@domain.com"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-500 focus:ring"
          />
        </label>
      </div>
    </section>
  );
}
