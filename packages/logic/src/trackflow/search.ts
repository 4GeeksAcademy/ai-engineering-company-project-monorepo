/**
 * TrackFlow - Operaciones de Búsqueda
 * Hito 2: Fundamentos de Programación
 */

import { Product, Shipment } from "./contracts";

// ============================================================================
// BÚSQUEDA LINEAL
// ============================================================================

/**
 * Busca un producto por SKU (búsqueda lineal, case-insensitive)
 */
export function findProductBySKU(
  products: Product[],
  sku: string
): Product | null {
  for (const product of products) {
    if (product.sku.toUpperCase() === sku.toUpperCase()) {
      return product;
    }
  }
  return null;
}

/**
 * Busca un envío por ID (búsqueda lineal)
 */
export function findShipmentById(
  shipments: Shipment[],
  id: string
): Shipment | null {
  for (const shipment of shipments) {
    if (shipment.id === id) {
      return shipment;
    }
  }
  return null;
}

// ============================================================================
// BÚSQUEDA BINARIA
// ============================================================================

/**
 * Busca un producto por peso usando búsqueda binaria
 */
export function binarySearchProductByWeight(
  sortedProducts: Product[],
  targetWeight: number
): number {
  let left = 0;
  let right = sortedProducts.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midWeight = sortedProducts[mid].weightKg;
    
    if (midWeight === targetWeight) {
      return mid;
    } else if (midWeight < targetWeight) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return -1;
}