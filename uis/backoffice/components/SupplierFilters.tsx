"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "@/lib/suppliers-api";
import CheckboxGroup from "./CheckboxGroup";

export default function SupplierFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedCategories = searchParams.getAll("product_category");
  const selectedStatuses = searchParams.getAll("status");
  const search = searchParams.get("q") ?? "";

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      if (value && value !== "") params.append(key, value);
      startTransition(() => {
        router.push(`/suppliers?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  const toggleMultiParam = useCallback(
    (key: string, value: string, checked: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      const existing = params.getAll(key);
      params.delete(key);
      const next = checked
        ? [...existing, value]
        : existing.filter((v) => v !== value);
      next.forEach((v) => params.append(key, v));
      startTransition(() => {
        router.push(`/suppliers?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push("/suppliers");
    });
  }, [router, startTransition]);

  const hasFilters =
    selectedCategories.length > 0 ||
    selectedStatuses.length > 0 ||
    search !== "";

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm ${isPending ? "opacity-60" : ""}`}
    >
      {/* Search */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Search
        </label>
        <input
          type="text"
          defaultValue={search}
          placeholder="Name, email, city…"
          onChange={(e) => setParam("q", e.target.value || null)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div className="flex flex-wrap gap-6">
        {/* Category filter */}
        <CheckboxGroup
          legend="Category"
          options={CATEGORY_OPTIONS}
          selected={selectedCategories}
          onToggle={(val, checked) =>
            toggleMultiParam("product_category", val, checked)
          }
        />

        {/* Status filter */}
        <CheckboxGroup
          legend="Status"
          options={[...STATUS_OPTIONS]}
          selected={selectedStatuses}
          onToggle={(val, checked) => toggleMultiParam("status", val, checked)}
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
