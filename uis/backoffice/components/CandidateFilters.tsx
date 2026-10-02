"use client";

import { Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import CheckboxGroup from "./CheckboxGroup";
import {
  STATUS_OPTIONS,
  STAGE_OPTIONS,
} from "@/lib/candidate-meta";
import type { CandidateStage, CandidateStatus } from "@/lib/types";

function buildUrl(pathname: string, params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function CandidateFiltersInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentSearch = searchParams.get("search") ?? "";
  const selectedStatuses = searchParams.getAll("status");
  const selectedStages = searchParams.getAll("stage");

  const navigateWithParams = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        newParams.delete(key);
        if (value === null) continue;
        if (Array.isArray(value)) {
          value.forEach((v) => newParams.append(key, v));
        } else {
          newParams.set(key, value);
        }
      }

      router.push(buildUrl(pathname, newParams));
    },
    [searchParams, pathname, router],
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      navigateWithParams({ search: e.target.value || null });
    }, 300);
  };

  const toggleStatus = (status: CandidateStatus, checked: boolean) => {
    const updated = checked
      ? [...selectedStatuses, status]
      : selectedStatuses.filter((s) => s !== status);
    navigateWithParams({ status: updated.length > 0 ? updated : null });
  };

  const toggleStage = (stage: CandidateStage, checked: boolean) => {
    const updated = checked
      ? [...selectedStages, stage]
      : selectedStages.filter((s) => s !== stage);
    navigateWithParams({ stage: updated.length > 0 ? updated : null });
  };

  const hasFilters =
    currentSearch.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedStages.length > 0;

  const clearFilters = () => router.push(pathname);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          placeholder="Search candidates…"
          defaultValue={currentSearch}
          onChange={handleSearchChange}
          className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <CheckboxGroup
          legend="Status"
          options={STATUS_OPTIONS}
          selected={selectedStatuses}
          onToggle={toggleStatus}
        />
        <CheckboxGroup
          legend="Stage"
          options={STAGE_OPTIONS}
          selected={selectedStages}
          onToggle={toggleStage}
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="self-start text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

export default function CandidateFilters() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <div className="h-9 w-full animate-pulse rounded-lg bg-zinc-100" />
        </div>
      }
    >
      <CandidateFiltersInner />
    </Suspense>
  );
}
