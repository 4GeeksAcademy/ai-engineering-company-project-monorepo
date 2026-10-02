"use client";

import { Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import CheckboxGroup from "../CheckboxGroup";
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

  // Debounced search
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
      {/* Search input */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          defaultValue={currentSearch}
          onChange={handleSearchChange}
          placeholder="Search by name or email…"
          className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="self-start text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:underline"
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
        <div className="h-24 animate-pulse rounded-lg bg-zinc-100" />
      }
    >
      <CandidateFiltersInner />
    </Suspense>
  );
}