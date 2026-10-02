import type { ProductCategory, SupplierStatus } from "./suppliers-types";

export interface SupplierFormState {
  full_name: string;
  email: string;
  phone: string;
  country: "Colombia" | "United States" | "";
  city: string;
  favorite_location: string;
  product_category: ProductCategory | "";
  rate: string;
  status: SupplierStatus;
  how_did_you_find_us: string;
  date_of_birth: string;
}

export const EMPTY_SUPPLIER_FORM: SupplierFormState = {
  full_name: "",
  email: "",
  phone: "",
  country: "",
  city: "",
  favorite_location: "",
  product_category: "",
  rate: "",
  status: "active",
  how_did_you_find_us: "",
  date_of_birth: "1990-01-01",
};

export type SupplierFormErrors = Partial<Record<keyof SupplierFormState, string>>;

export function validateSupplierForm(
  form: SupplierFormState,
): SupplierFormErrors {
  const errors: SupplierFormErrors = {};

  if (!form.full_name.trim()) errors.full_name = "Required";
  if (!form.email.trim()) errors.email = "Required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Invalid email";
  if (!form.phone.trim()) errors.phone = "Required";
  if (!form.country) errors.country = "Required";
  if (!form.city.trim()) errors.city = "Required";
  if (!form.product_category) errors.product_category = "Required";
  if (!form.rate.trim()) errors.rate = "Required";
  else if (isNaN(Number(form.rate)) || Number(form.rate) <= 0)
    errors.rate = "Must be a positive number";
  if (!form.how_did_you_find_us.trim()) errors.how_did_you_find_us = "Required";

  return errors;
}

export function supplierFormToPayload(form: SupplierFormState) {
  return {
    full_name: form.full_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    country: form.country as "Colombia" | "United States",
    city: form.city.trim(),
    favorite_location: form.favorite_location.trim() || undefined,
    product_category: form.product_category as ProductCategory,
    rate: Number(form.rate),
    status: form.status,
    how_did_you_find_us: form.how_did_you_find_us.trim(),
    date_of_birth: form.date_of_birth,
    accepts_terms: true as const,
    wants_email_offers: false,
  };
}
