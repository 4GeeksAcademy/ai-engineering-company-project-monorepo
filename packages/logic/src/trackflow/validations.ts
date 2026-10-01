/**
 * TrackFlow - Validaciones de Reglas de Negocio
 * Hito 2: Fundamentos de Programación
 * 
 * Implementa validación estricta de todas las entidades según
 * las reglas de negocio definidas por Ana Whitfield.
 * Retorna resultado de validación con errores específicos.
 */

import {
  Carrier,
  Product,
  Shipment,
  ValidationResult,
} from "./contracts";

// ============================================================================
// VALIDACIONES DE PRODUCTO
// ============================================================================

/**
 * Valida un producto contra todas las reglas de negocio
 * 
 * Reglas:
 * - sku: no debe estar vacío
 * - weightKg: debe ser > 0 y <= 100
 * - dimensiones: todas > 0 y <= 200
 * - stockQuantity: debe ser >= 0
 * - minStockThreshold: debe ser >= 0
 * - unitCostUSD: debe ser > 0
 * 
 * @param product - Producto a validar
 * @returns ValidationResult con valid y array de errores
 * 
 * @example
 * // Producto válido
 * validateProduct(sampleShoe) 
 * // { valid: true, errors: [] }
 * 
 * // Producto inválido (peso negativo)
 * validateProduct({ ...sampleShoe, weightKg: -5 })
 * // { valid: false, errors: ["Weight must be greater than 0"] }
 */
export function validateProduct(product: Product): ValidationResult {
  const errors: string[] = [];
  
  // Validar SKU
  if (!product.sku || product.sku.trim().length === 0) {
    errors.push("SKU must not be empty");
  }
  
  // Validar peso
  if (product.weightKg <= 0) {
    errors.push("Weight must be greater than 0 kg");
  }
  if (product.weightKg > 100) {
    errors.push("Weight must not exceed 100 kg");
  }
  
  // Validar dimensiones
  const dimensions = product.dimensions;
  
  if (dimensions.lengthCm <= 0 || dimensions.lengthCm > 200) {
    errors.push(
      "Length must be greater than 0 and not exceed 200 cm"
    );
  }
  
  if (dimensions.widthCm <= 0 || dimensions.widthCm > 200) {
    errors.push(
      "Width must be greater than 0 and not exceed 200 cm"
    );
  }
  
  if (dimensions.heightCm <= 0 || dimensions.heightCm > 200) {
    errors.push(
      "Height must be greater than 0 and not exceed 200 cm"
    );
  }
  
  // Validar stock
  if (product.stockQuantity < 0) {
    errors.push("Stock quantity must be greater than or equal to 0");
  }
  
  // Validar umbral mínimo
  if (product.minStockThreshold < 0) {
    errors.push("Minimum stock threshold must be greater than or equal to 0");
  }
  
  // Validar costo unitario
  if (product.unitCostUSD <= 0) {
    errors.push("Unit cost must be greater than 0");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// VALIDACIONES DE ENVÍO
// ============================================================================

/**
 * Valida un envío contra todas las reglas de negocio
 * 
 * Reglas:
 * - quantity: debe ser > 0
 * - declaredValueUSD: debe ser > 0
 * - distanceKm: debe ser >= 0
 * 
 * @param shipment - Envío a validar
 * @returns ValidationResult con valid y array de errores
 * 
 * @example
 * // Envío válido
 * validateShipment(sampleShipment)
 * // { valid: true, errors: [] }
 * 
 * // Envío inválido (cantidad 0)
 * validateShipment({ ...sampleShipment, quantity: 0 })
 * // { valid: false, errors: ["Quantity must be greater than 0"] }
 */
export function validateShipment(shipment: Shipment): ValidationResult {
  const errors: string[] = [];
  
  // Validar cantidad
  if (shipment.quantity <= 0) {
    errors.push("Quantity must be greater than 0");
  }
  
  // Validar valor declarado
  if (shipment.declaredValueUSD <= 0) {
    errors.push("Declared value must be greater than 0");
  }
  
  // Validar distancia
  if (shipment.destination.distanceKm < 0) {
    errors.push("Distance must be greater than or equal to 0 km");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// VALIDACIONES DE TRANSPORTISTA
// ============================================================================

/**
 * Valida un transportista contra todas las reglas de negocio
 * 
 * Reglas:
 * - baseRateUSD, ratePerKgUSD, ratePerKmUSD: deben ser >= 0
 * - avgDeliveryDays: debe ser > 0
 * - onTimeRate: debe estar entre 0 y 100
 * - maxWeightKg: debe ser > 0
 * - operatesIn: debe contener al menos 1 país
 * 
 * @param carrier - Transportista a validar
 * @returns ValidationResult con valid y array de errores
 * 
 * @example
 * // Transportista válido
 * validateCarrier(sampleUPS)
 * // { valid: true, errors: [] }
 * 
 * // Transportista inválido (tasa negativa)
 * validateCarrier({ ...sampleUPS, ratePerKgUSD: -1.2 })
 * // { valid: false, errors: ["Rate per kg must be >= 0"] }
 */
export function validateCarrier(carrier: Carrier): ValidationResult {
  const errors: string[] = [];
  
  // Validar tarifas
  if (carrier.baseRateUSD < 0) {
    errors.push("Base rate must be greater than or equal to 0");
  }
  
  if (carrier.ratePerKgUSD < 0) {
    errors.push("Rate per kg must be greater than or equal to 0");
  }
  
  if (carrier.ratePerKmUSD < 0) {
    errors.push("Rate per km must be greater than or equal to 0");
  }
  
  // Validar tiempo promedio de entrega
  if (carrier.avgDeliveryDays <= 0) {
    errors.push("Average delivery days must be greater than 0");
  }
  
  // Validar tasa de entrega a tiempo
  if (carrier.onTimeRate < 0 || carrier.onTimeRate > 100) {
    errors.push("On-time rate must be between 0 and 100");
  }
  
  // Validar peso máximo
  if (carrier.maxWeightKg <= 0) {
    errors.push("Maximum weight must be greater than 0");
  }
  
  // Validar países operacionales
  if (carrier.operatesIn.length === 0) {
    errors.push("Carrier must operate in at least one country");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
