/**
 * Brasaland domain entities and shared scalar types.
 * Source of truth: CONTEXT.md
 */

export type ID = string;
export type ISODateTimeString = string;
export type CurrencyCode = "COP" | "USD";
export type Country = "Colombia" | "USA";
export type Region = "Colombia" | "Florida";

export type BranchStatus = "active" | "inactive" | "temporary_closed";
export type MenuAvailability = "available" | "unavailable" | "seasonal";
export type OrderChannel = "dine_in" | "takeaway" | "delivery" | "phone";
export type OrderStatus =
  | "created"
  | "in_prep"
  | "ready"
  | "completed"
  | "cancelled";
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "cancelled"
  | "completed";

export interface Branch {
  branch_id: ID;
  name: string;
  city: string;
  country: Country;
  timezone: string;
  status: BranchStatus;
  opening_hours: string;
}

export interface MenuItem {
  item_id: ID;
  name: string;
  category: string;
  price: number;
  currency: CurrencyCode;
  availability: MenuAvailability;
  allergens: string[];
}

export interface Order {
  order_id: ID;
  created_at: ISODateTimeString;
  branch_id: ID;
  customer_id: ID;
  channel: OrderChannel;
  status: OrderStatus;
  total_amount: number;
}

export interface Customer {
  customer_id: ID;
  name: string;
  contact: string;
  city: string;
  loyalty_tier: string;
  preferences: string[];
}

export interface Reservation {
  reservation_id: ID;
  customer_id: ID;
  branch_id: ID;
  datetime: ISODateTimeString;
  party_size: number;
  status: ReservationStatus;
}

/**
 * Rule: menu availability may vary by branch.
 */
export interface BranchMenuAvailability {
  branch_id: ID;
  item_id: ID;
  availability: MenuAvailability;
}

/**
 * Rule: prep times differ by product category.
 */
export interface PrepTimeByCategory {
  category: string;
  prep_time_minutes: number;
}

/**
 * Rule: promotions have region/date constraints.
 */
export interface Promotion {
  promotion_id: ID;
  name: string;
  region: Region;
  starts_at: ISODateTimeString;
  ends_at: ISODateTimeString;
}

/**
 * Rule: compliance obligations differ by region.
 */
export interface RegionalCompliance {
  region: Region;
  tax_profile: string;
  labor_rule_profile: string;
  labeling_profile: string;
}
