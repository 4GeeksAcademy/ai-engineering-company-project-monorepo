export type MenuCategory =
  | "Meat"
  | "Side"
  | "Beverage"
  | "Dessert"
  | "Combo";

export type MenuItemStatus =
  | "Active"
  | "Seasonal"
  | "Discontinued";

export type PaymentMethod =
  | "Cash"
  | "Credit card"
  | "Debit card"
  | "Digital wallet";

export type Country =
  | "Colombia"
  | "USA";

export type LocationStatus =
  | "Active"
  | "Temporarily closed"
  | "Under renovation";

export type WasteReason =
  | "Expired"
  | "Cooking error"
  | "Customer return"
  | "Damage"
  | "Other";

export interface Price {
  USD: number;
  COP: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  basePrice: Price;
  ingredientCost: Price;
  prepTimeMinutes: number;
  isAvailableInColombia: boolean;
  isAvailableInUSA: boolean;
  allergens: string[];
  status: MenuItemStatus;
}

export interface SaleTransaction {
  id: string;
  locationId: string;
  itemId: string;
  quantity: number;
  totalPrice: Price;
  paymentMethod: PaymentMethod;
  timestamp: Date;
  waiterName: string;
}

export interface Location {
  id: string;
  name: string;
  city: string;
  country: Country;
  openingYear: number;
  seatingCapacity: number;
  staffCount: number;
  monthlyRentCost: Price;
  averageMonthlyUtilities: Price;
  manager: string;
  status: LocationStatus;
}

export interface WasteRecord {
  id: string;
  locationId: string;
  itemId: string;
  quantity: number;
  reason: WasteReason;
  cost: Price;
  timestamp: Date;
  reportedBy: string;
}

export interface CountryMetrics {
  totalLocations: number;
  totalRevenue: Price;
  averageRevenuePerLocation: Price;
  totalSales: number;
}
