import { Carrier, Product, Shipment, ValidationResult } from "../types/models";

function isValidDate(value: Date): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function validateProduct(product: Product): ValidationResult {
  const errors: string[] = [];

  if (product.sku.trim() === "") {
    errors.push("sku must not be empty");
  }

  if (product.weightKg <= 0 || product.weightKg > 100) {
    errors.push("weightKg must be > 0 and <= 100");
  }

  if (product.dimensions.lengthCm <= 0 || product.dimensions.lengthCm > 200) {
    errors.push("dimensions.lengthCm must be > 0 and <= 200");
  }

  if (product.dimensions.widthCm <= 0 || product.dimensions.widthCm > 200) {
    errors.push("dimensions.widthCm must be > 0 and <= 200");
  }

  if (product.dimensions.heightCm <= 0 || product.dimensions.heightCm > 200) {
    errors.push("dimensions.heightCm must be > 0 and <= 200");
  }

  if (product.stockQuantity < 0) {
    errors.push("stockQuantity must be >= 0");
  }

  if (product.minStockThreshold < 0) {
    errors.push("minStockThreshold must be >= 0");
  }

  if (product.unitCostUSD <= 0) {
    errors.push("unitCostUSD must be > 0");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateShipment(shipment: Shipment): ValidationResult {
  const errors: string[] = [];

  if (shipment.id.trim() === "") {
    errors.push("id must not be empty");
  }

  if (shipment.sku.trim() === "") {
    errors.push("sku must not be empty");
  }

  if (shipment.quantity <= 0) {
    errors.push("quantity must be > 0");
  }

  if (shipment.declaredValueUSD <= 0) {
    errors.push("declaredValueUSD must be > 0");
  }

  if (shipment.destination.distanceKm < 0) {
    errors.push("distanceKm must be >= 0");
  }

  if (!isValidDate(shipment.createdAt)) {
    errors.push("createdAt must be a valid Date");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateCarrier(carrier: Carrier): ValidationResult {
  const errors: string[] = [];

  if (carrier.id.trim() === "") {
    errors.push("id must not be empty");
  }

  if (carrier.name.trim() === "") {
    errors.push("name must not be empty");
  }

  if (carrier.baseRateUSD < 0) {
    errors.push("baseRateUSD must be >= 0");
  }

  if (carrier.ratePerKgUSD < 0) {
    errors.push("ratePerKgUSD must be >= 0");
  }

  if (carrier.ratePerKmUSD < 0) {
    errors.push("ratePerKmUSD must be >= 0");
  }

  if (carrier.avgDeliveryDays <= 0) {
    errors.push("avgDeliveryDays must be > 0");
  }

  if (carrier.onTimeRate < 0 || carrier.onTimeRate > 100) {
    errors.push("onTimeRate must be between 0 and 100");
  }

  if (carrier.maxWeightKg <= 0) {
    errors.push("maxWeightKg must be > 0");
  }

  if (carrier.operatesIn.length === 0) {
    errors.push("operatesIn must contain at least 1 country");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}