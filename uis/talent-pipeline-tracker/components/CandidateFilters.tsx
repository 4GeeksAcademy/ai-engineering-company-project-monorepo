"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { STAGE_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import type { Stage, Status } from "@/types";

export default function CandidateFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get("status") ?? "";
  const stageParam = searchParams.get("stage") ?? "";
  const searchParam = searchParams.get("search") ?? "";

  const [draftSearch, setDraftSearch] = useState<string | null>(null);
  const searchInput = draftSearch ?? searchParam;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const nextSearch = searchInput.trim();

      if (nextSearch) {
        params.set("search", nextSearch);
      } else {
        params.delete("search");
      }

      const next = params.toString();
      const current = searchParams.toString();
      if (next !== current) {
        router.replace(next ? `/?${next}` : "/");
        setDraftSearch(null);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput, router, searchParams]);

  const updateParam = (key: "status" | "stage", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const next = params.toString();
    router.replace(next ? `/?${next}` : "/");
  };

  return (
    <div className="grid gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-3">
      <div>
        <label
          htmlFor="search"
          className="mb-1 block text-sm font-medium text-stone-700"
        >
          Buscar por nombre o email
        </label>
        <input
          id="search"
          type="search"
          value={searchInput}
          onChange={(e) => setDraftSearch(e.target.value)}
          placeholder="Ej. María o maria@email.com"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none ring-orange-500 focus:ring-2"
        />
      </div>

      <div>
        <label
          htmlFor="status"
          className="mb-1 block text-sm font-medium text-stone-700"
        >
          Estado
        </label>
        <select
          id="status"
          value={statusParam}
          onChange={(e) => updateParam("status", e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none ring-orange-500 focus:ring-2"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="stage"
          className="mb-1 block text-sm font-medium text-stone-700"
        >
          Etapa
        </label>
        <select
          id="stage"
          value={stageParam}
          onChange={(e) => updateParam("stage", e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none ring-orange-500 focus:ring-2"
        >
          <option value="">Todas las etapas</option>
          {STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function useCandidateFilters() {
  const searchParams = useSearchParams();

  return {
    status: (searchParams.get("status") as Status | null) || undefined,
    stage: (searchParams.get("stage") as Stage | null) || undefined,
    search: searchParams.get("search") || undefined,
  };
}
