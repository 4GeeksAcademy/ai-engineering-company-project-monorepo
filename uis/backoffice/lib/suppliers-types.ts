// ── Supplier types matching the API schemas ────────────────

export type SupplierStatus = "active" | "suspended";

export type ProductCategory =
  | "Meat"
  | "Produce"
  | "Beverages"
  | "Dairy"
  | "Seafood"
  | "Spices"
  | "Other";

export interface Supplier {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  country: "Colombia" | "United States";
  city: string;
  favorite_location: string | null;
  dietary_preferences: string[];
  how_did_you_find_us: string;
  date_of_birth: string;
  accepts_terms: boolean;
  wants_email_offers: boolean;
  product_category: ProductCategory;
  rate: number;
  status: SupplierStatus;
  created_at: string;
  updated_at: string;
}

export interface SupplierCreate {
  full_name: string;
  email: string;
  phone: string;
  country: "Colombia" | "United States";
  city: string;
  favorite_location?: string;
  dietary_preferences?: string[];
  how_did_you_find_us: string;
  date_of_birth: string;
  accepts_terms: true;
  wants_email_offers?: boolean;
  product_category: ProductCategory;
  rate: number;
  status?: SupplierStatus;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}
