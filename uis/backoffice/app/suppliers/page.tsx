import Link from "next/link";
import { Suspense } from "react";
import { fetchSuppliers } from "@/lib/suppliers-api";
import PageHeader from "@/components/PageHeader";
import SupplierFilters from "@/components/SupplierFilters";
import SupplierListClient from "@/components/SupplierListClient";

interface SuppliersProps {
  searchParams: Promise<{
    product_category?: string;
    status?: string;
    q?: string;
  }>;
}

async function SuppliersData({
  searchParams,
}: {
  searchParams: SuppliersProps["searchParams"];
}) {
  const sp = await searchParams;
  const category = sp.product_category ?? undefined;
  const status = sp.status ?? undefined;

  try {
    const suppliers = await fetchSuppliers({
      product_category: category,
      status,
    });

    if (suppliers.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500">
          No suppliers found.
        </div>
      );
    }

    return <SupplierListClient suppliers={suppliers} />;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load suppliers.";
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {message}
      </div>
    );
  }
}

export default async function SuppliersPage({
  searchParams,
}: SuppliersProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers Directory"
        description="Manage restaurant supply chain partners."
        actions={
          <Link
            href="/suppliers/new"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1"
          >
            + New supplier
          </Link>
        }
      />

      <div className="mb-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <SupplierFilters />
      </div>

      <Suspense
        fallback={
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500 shadow-sm">
            Loading suppliers…
          </div>
        }
      >
        <SuppliersData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
