"use client";

import { useState, useTransition } from "react";
import type { Supplier, SupplierStatus } from "@/lib/suppliers-types";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  CATEGORY_STYLES,
  updateSupplierRate,
  updateSupplierStatus,
} from "@/lib/suppliers-api";
import Badge from "./Badge";

interface SuppliersTableProps {
  suppliers: Supplier[];
  onSupplierUpdated: (supplier: Supplier) => void;
}

export default function SuppliersTable({
  suppliers,
  onSupplierUpdated,
}: SuppliersTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Rate</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {suppliers.map((supplier) => (
              <SupplierRow
                key={supplier.id}
                supplier={supplier}
                onSupplierUpdated={onSupplierUpdated}
              />
            ))}
          </tbody>
        </table>
      </div>

      {suppliers.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-zinc-500">
          No suppliers found.
        </div>
      )}
    </div>
  );
}

/* ── Individual row with inline editing ─────────────────── */

function SupplierRow({
  supplier,
  onSupplierUpdated,
}: {
  supplier: Supplier;
  onSupplierUpdated: (s: Supplier) => void;
}) {
  const [editingRate, setEditingRate] = useState(false);
  const [rateValue, setRateValue] = useState(String(supplier.rate));
  const [rateError, setRateError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleRateSave() {
    const num = Number(rateValue);
    if (isNaN(num) || num <= 0) {
      setRateError("Must be > 0");
      return;
    }
    setRateError("");
    setEditingRate(false);

    startTransition(async () => {
      try {
        const updated = await updateSupplierRate(supplier.id, num);
        onSupplierUpdated(updated);
      } catch {
        setRateValue(String(supplier.rate));
        setEditingRate(true);
      }
    });
  }

  function handleStatusToggle() {
    const next: SupplierStatus =
      supplier.status === "active" ? "suspended" : "active";

    startTransition(async () => {
      try {
        const updated = await updateSupplierStatus(supplier.id, next);
        onSupplierUpdated(updated);
      } catch {
        // revert silently — UI stays on old status
      }
    });
  }

  return (
    <tr className={`transition-opacity ${isPending ? "opacity-50" : ""}`}>
      {/* Supplier name + email */}
      <td className="px-4 py-3">
        <p className="font-medium text-zinc-900">{supplier.full_name}</p>
        <p className="text-xs text-zinc-500">{supplier.email}</p>
      </td>

      {/* Country / City */}
      <td className="px-4 py-3 text-zinc-700">
        <span>{supplier.country}</span>
        <span className="block text-xs text-zinc-500">{supplier.city}</span>
      </td>

      {/* Category badge */}
      <td className="px-4 py-3">
        <Badge
          label={supplier.product_category}
          className={CATEGORY_STYLES[supplier.product_category] ?? ""}
        />
      </td>

      {/* Editable rate */}
      <td className="px-4 py-3">
        {editingRate ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={rateValue}
              onChange={(e) => {
                setRateValue(e.target.value);
                setRateError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRateSave();
                if (e.key === "Escape") {
                  setRateValue(String(supplier.rate));
                  setEditingRate(false);
                }
              }}
              autoFocus
              className="w-16 rounded border border-indigo-300 px-1.5 py-0.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200"
            />
            <button
              type="button"
              onClick={handleRateSave}
              className="rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => {
                setRateValue(String(supplier.rate));
                setEditingRate(false);
                setRateError("");
              }}
              className="rounded px-1.5 py-0.5 text-xs font-medium text-zinc-500 hover:text-zinc-700"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingRate(true)}
            className="rounded px-1.5 py-0.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            title="Click to edit rate"
          >
            ⭐ {supplier.rate.toFixed(1)}
          </button>
        )}
        {rateError && (
          <span className="block text-xs text-rose-600">{rateError}</span>
        )}
      </td>

      {/* Status badge + toggle */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge
            label={STATUS_LABELS[supplier.status] ?? supplier.status}
            className={STATUS_STYLES[supplier.status] ?? ""}
          />
          <button
            type="button"
            onClick={handleStatusToggle}
            title={
              supplier.status === "active"
                ? "Suspend supplier"
                : "Reactivate supplier"
            }
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1 ${
              supplier.status === "active" ? "bg-emerald-500" : "bg-zinc-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                supplier.status === "active"
                  ? "translate-x-[18px]"
                  : "translate-x-[3px]"
              }`}
            />
          </button>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <span className="text-xs text-zinc-400" title={supplier.phone}>
          📞
        </span>
      </td>
    </tr>
  );
}
