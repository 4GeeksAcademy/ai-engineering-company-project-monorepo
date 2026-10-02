"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupplier } from "@/lib/suppliers-api";
import {
  EMPTY_SUPPLIER_FORM,
  validateSupplierForm,
  supplierFormToPayload,
} from "@/lib/supplier-form";
import type { SupplierFormState, SupplierFormErrors } from "@/lib/supplier-form";
import FormField from "./FormField";
import Select from "./Select";
import Toast from "./Toast";
import { CATEGORY_OPTIONS } from "@/lib/suppliers-api";

export default function SupplierForm() {
  const router = useRouter();

  const [form, setForm] = useState<SupplierFormState>(EMPTY_SUPPLIER_FORM);
  const [errors, setErrors] = useState<SupplierFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  function setField(field: keyof SupplierFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = validateSupplierForm(form);
    setErrors(nextErrors);
    setToast(null);

    if (Object.values(nextErrors).some(Boolean)) return;

    const payload = supplierFormToPayload(form);

    setSubmitting(true);
    try {
      await createSupplier(payload);
      setToast({
        kind: "success",
        message: "Supplier created successfully.",
      });
      setTimeout(() => {
        router.push("/suppliers");
        router.refresh();
      }, 800);
    } catch (err) {
      setToast({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Failed to create supplier.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {toast && <Toast kind={toast.kind} message={toast.message} />}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
          New supplier
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2"
        >
          {/* Name */}
          <FormField
            label="Full name"
            required
            type="text"
            value={form.full_name}
            onChange={(e) => setField("full_name", e.target.value)}
            placeholder="Isabella Martinez"
            error={errors.full_name}
            className="sm:col-span-2"
          />

          {/* Email */}
          <FormField
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="supplier@example.com"
            error={errors.email}
            className="sm:col-span-2"
          />

          {/* Phone */}
          <FormField
            label="Phone"
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="+57 300 123 4567"
            error={errors.phone}
          />

          {/* Date of birth */}
          <FormField
            label="Date of birth"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => setField("date_of_birth", e.target.value)}
          />

          {/* Country */}
          <Select
            label="Country"
            value={form.country}
            onChange={(val) => setField("country", val)}
            options={[
              { value: "", label: "Select country" },
              { value: "Colombia", label: "Colombia" },
              { value: "United States", label: "United States" },
            ]}
          />

          {/* City */}
          <FormField
            label="City"
            required
            type="text"
            value={form.city}
            onChange={(e) => setField("city", e.target.value)}
            placeholder="Bogotá"
            error={errors.city}
          />

          {/* Product Category */}
          <Select
            label="Product category"
            value={form.product_category}
            onChange={(val) => setField("product_category", val)}
            options={[
              { value: "", label: "Select category" },
              ...CATEGORY_OPTIONS,
            ]}
          />

          {/* Rate */}
          <FormField
            label="Rate (⭐ 1–5)"
            required
            type="number"
            min="0.1"
            step="0.1"
            value={form.rate}
            onChange={(e) => setField("rate", e.target.value)}
            placeholder="4.5"
            error={errors.rate}
          />

          {/* Favorite location */}
          <FormField
            label="Favorite location"
            type="text"
            value={form.favorite_location}
            onChange={(e) => setField("favorite_location", e.target.value)}
            placeholder="Chapinero, Bogotá"
          />

          {/* How found */}
          <FormField
            label="How did you find us?"
            required
            type="text"
            value={form.how_did_you_find_us}
            onChange={(e) => setField("how_did_you_find_us", e.target.value)}
            placeholder="Google, referral, etc."
            error={errors.how_did_you_find_us}
            className="sm:col-span-2"
          />

          {/* Actions */}
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {submitting ? "Saving…" : "Create supplier"}
            </button>
            <Link
              href="/suppliers"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-700 hover:underline"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
