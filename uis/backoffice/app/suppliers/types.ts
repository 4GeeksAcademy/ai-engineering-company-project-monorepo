export interface Supplier {
  id: number;
  name: string;
  country: "USA" | "Spain";
  categories: string[];
  rate_per_shipment: number;
  currency: "USD" | "EUR";
  status: "active" | "suspended";
  service_zone?: string;
  contact_email?: string;
  notes?: string;
  updated_at: string;
}

export const VALID_CATEGORIES = [
  "carrier_last_mile",
  "carrier_international",
  "warehouse_supplies",
  "packaging_materials",
  "reverse_logistics",
  "fleet_maintenance",
  "it_and_wms_software",
  "cleaning_and_facilities"
];
