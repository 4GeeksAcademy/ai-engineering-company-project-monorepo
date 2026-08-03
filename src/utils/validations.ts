import { Carrier, Product, Shipment } from '../types/models';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function makeResult(errors: string[]): ValidationResult {
  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateProduct(product: Product): ValidationResult {
  const errors: string[] = [];

  if (product.sku.trim().length === 0) {
    errors.push('sku must not be empty');
  }

  if (!Number.isFinite(product.weightKg) || product.weightKg <= 0 || product.weightKg > 100) {
    errors.push('weightKg must be > 0 and <= 100');
  }

  if (
    !Number.isFinite(product.dimensions.lengthCm) ||
    product.dimensions.lengthCm <= 0 ||
    product.dimensions.lengthCm > 200
  ) {
    errors.push('dimensions.lengthCm must be > 0 and <= 200');
  }

  if (
    !Number.isFinite(product.dimensions.widthCm) ||
    product.dimensions.widthCm <= 0 ||
    product.dimensions.widthCm > 200
  ) {
    errors.push('dimensions.widthCm must be > 0 and <= 200');
  }

  if (
    !Number.isFinite(product.dimensions.heightCm) ||
    product.dimensions.heightCm <= 0 ||
    product.dimensions.heightCm > 200
  ) {
    errors.push('dimensions.heightCm must be > 0 and <= 200');
  }

  if (!Number.isFinite(product.stockQuantity) || product.stockQuantity < 0) {
    errors.push('stockQuantity must be >= 0');
  }

  if (!Number.isFinite(product.minStockThreshold) || product.minStockThreshold < 0) {
    errors.push('minStockThreshold must be >= 0');
  }

  if (!Number.isFinite(product.unitCostUSD) || product.unitCostUSD <= 0) {
    errors.push('unitCostUSD must be > 0');
  }

  return makeResult(errors);
}

export function validateShipment(shipment: Shipment): ValidationResult {
  const errors: string[] = [];

  if (!Number.isFinite(shipment.quantity) || shipment.quantity <= 0) {
    errors.push('quantity must be > 0');
  }

  if (!Number.isFinite(shipment.declaredValueUSD) || shipment.declaredValueUSD <= 0) {
    errors.push('declaredValueUSD must be > 0');
  }

  if (!Number.isFinite(shipment.destination.distanceKm) || shipment.destination.distanceKm < 0) {
    errors.push('distanceKm must be >= 0');
  }

  return makeResult(errors);
}

export function validateCarrier(carrier: Carrier): ValidationResult {
  const errors: string[] = [];

  if (!Number.isFinite(carrier.baseRateUSD) || carrier.baseRateUSD < 0) {
    errors.push('baseRateUSD must be >= 0');
  }

  if (!Number.isFinite(carrier.ratePerKgUSD) || carrier.ratePerKgUSD < 0) {
    errors.push('ratePerKgUSD must be >= 0');
  }

  if (!Number.isFinite(carrier.ratePerKmUSD) || carrier.ratePerKmUSD < 0) {
    errors.push('ratePerKmUSD must be >= 0');
  }

  if (!Number.isFinite(carrier.avgDeliveryDays) || carrier.avgDeliveryDays <= 0) {
    errors.push('avgDeliveryDays must be > 0');
  }

  if (!Number.isFinite(carrier.onTimeRate) || carrier.onTimeRate < 0 || carrier.onTimeRate > 100) {
    errors.push('onTimeRate must be between 0 and 100');
  }

  if (!Number.isFinite(carrier.maxWeightKg) || carrier.maxWeightKg <= 0) {
    errors.push('maxWeightKg must be > 0');
  }

  if (carrier.operatesIn.length < 1) {
    errors.push('operatesIn must contain at least 1 country');
  }

  return makeResult(errors);
}