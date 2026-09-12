// packages/logic/src/trackflow/contracts.ts

export type WarehouseLocation = "Los Angeles" | "Zaragoza";
export type ProductStatus = "Active" | "Low stock" | "Out of stock";
export type ProductCategory = "Fashion" | "Electronics" | "Cosmetics" | "Home" | "Other";
export type ShipmentPriority = "Standard" | "Express" | "Same-day";
export type ShipmentStatus = "Pending" | "Assigned" | "In transit" | "Delivered" | "Failed";

export interface ProductDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ShipmentDestination {
  city: string;
  country: string;
  postalCode: string;
  distanceKm: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  weightKg: number;
  dimensions: ProductDimensions;
  stockQuantity: number;
  minStockThreshold: number;
  unitCostUSD: number;
  isFragile: boolean;
  warehouse: WarehouseLocation;
  status: ProductStatus;
}

export interface Carrier {
  id: string;
  name: string;
  operatesIn: string[];
  baseRateUSD: number;
  ratePerKgUSD: number;
  ratePerKmUSD: number;
  avgDeliveryDays: number;
  onTimeRate: number;
  maxWeightKg: number;
  handlesFragile: boolean;
  acceptsPriority: ShipmentPriority[];
}

export interface Shipment {
  id: string;
  sku: string;
  quantity: number;
  origin: WarehouseLocation;
  destination: ShipmentDestination;
  priority: ShipmentPriority;
  declaredValueUSD: number;
  carrier: string | null;
  status: ShipmentStatus;
  createdAt: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CarrierSelection {
  carrier: Carrier;
  score: number;
  cost: number;
}

export interface CarrierUsage {
  carrier: string;
  count: number;
}

export type CandidateStatus = "received" | "in_progress" | "discarded" | string;
export type CandidateStage = "pending" | "review" | "technical_interview" | string;

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  experienceYears: number;
  status: CandidateStatus;
  stage: CandidateStage;
  linkedin: string;
  createdAt: string;
}

export interface CandidateInput {
  name: string;
  email: string;
  phone: string;
  position: string;
  experienceYears: number;
  status: CandidateStatus;
  stage: CandidateStage;
  linkedin: string;
}

export interface Note {
  id: string;
  recordId: string;
  content: string;
  createdAt: string;
}