"use client";

import { useState } from "react";
import type { Supplier } from "@/lib/suppliers-types";
import SuppliersTable from "./SuppliersTable";

export default function SupplierListClient({
  suppliers: initial,
}: {
  suppliers: Supplier[];
}) {
  const [suppliers, setSuppliers] = useState(initial);

  function handleSupplierUpdated(updated: Supplier) {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
  }

  const activeCount = suppliers.filter((s) => s.status === "active").length;
  const suspendedCount = suppliers.filter(
    (s) => s.status === "suspended",
  ).length;

  return (
    <>
      {/* Stats summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Suppliers" value={suppliers.length} />
        <StatCard
          label="Active"
          value={activeCount}
          accent="text-emerald-600"
        />
        <StatCard
          label="Suspended"
          value={suspendedCount}
          accent="text-rose-600"
        />
      </div>

      {/* Table */}
      <SuppliersTable
        suppliers={suppliers}
        onSupplierUpdated={handleSupplierUpdated}
      />
    </>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "text-zinc-900"}`}>
        {value}
      </p>
    </div>
  );
}
