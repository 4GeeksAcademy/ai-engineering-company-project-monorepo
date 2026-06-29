"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CANDIDATE_STATUS_VALUES, CANDIDATE_STAGE_VALUES } from "@/lib/constants";
import { STATUS_LABELS } from "@/lib/constants";
import { STAGE_LABELS } from "@/lib/constants";
import { useDebounce } from "@/hooks/useDebounce";

export function CandidateFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebounce(searchInput, 300);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("page");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (debouncedSearch !== current) {
      updateParams({ search: debouncedSearch || undefined });
    }
  }, [debouncedSearch, updateParams, searchParams]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-2">
        <label htmlFor="filter-status" className="text-xs text-slate-400">
          Estado
        </label>
        <select
          id="filter-status"
          value={searchParams.get("status") ?? ""}
          onChange={(e) =>
            updateParams({ status: e.target.value || undefined })
          }
          className="rounded-md border border-white/10 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-400"
        >
          <option value="">Todos</option>
          {CANDIDATE_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="filter-stage" className="text-xs text-slate-400">
          Etapa
        </label>
        <select
          id="filter-stage"
          value={searchParams.get("stage") ?? ""}
          onChange={(e) =>
            updateParams({ stage: e.target.value || undefined })
          }
          className="rounded-md border border-white/10 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-400"
        >
          <option value="">Todas</option>
          {CANDIDATE_STAGE_VALUES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label htmlFor="filter-search" className="text-xs text-slate-400">
          Buscar
        </label>
        <input
          id="filter-search"
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Nombre o email..."
          className="w-48 rounded-md border border-white/10 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-400"
        />
      </div>
    </div>
  );
}
