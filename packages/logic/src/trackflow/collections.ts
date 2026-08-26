/**
 * TrackFlow - Operaciones de Colecciones Inmutables
 * Hito 2: Fundamentos de Programación
 * 
 * Funciones de filtrado, búsqueda y ordenamiento que garantizan
 * inmutabilidad: nunca modifican arrays originales.
 * Usan exclusivamente .filter(), .map(), .reduce() y spread operator.
 */

import {
  Carrier,
  Product,
  ProductCategory,
  WarehouseLocation,
} from "./contracts"; // Importación relativa limpia

// ============================================================================
// FILTRADO DE PRODUCTOS
// ============================================================================

/**
 * Filtra productos por almacén (inmutable)
 * 
 * @param products - Array original (no se modifica)
 * @param warehouse - Almacén a filtrar
 * @returns Nuevo array con productos del almacén especificado
 * 
 * @example
 * filterProductsByWarehouse(allProducts, "Los Angeles")
 * // Retorna solo productos ubicados en Los Angeles
 */
export function filterProductsByWarehouse(
  products: Product[],
  warehouse: WarehouseLocation
): Product[] {
  return products.filter((product) => product.warehouse === warehouse);
}

/**
 * Filtra productos por categoría (inmutable)
 * 
 * @param products - Array original (no se modifica)
 * @param category - Categoría a filtrar
 * @returns Nuevo array con productos de la categoría especificada
 * 
 * @example
 * filterProductsByCategory(allProducts, "Electronics")
 * // Retorna solo productos electrónicos
 */
export function filterProductsByCategory(
  products: Product[],
  category: ProductCategory
): Product[] {
  return products.filter((product) => product.category === category);
}

/**
 * Filtra productos con stock bajo (inmutable)
 * 
 * Retorna productos donde: stockQuantity <= minStockThreshold
 * Útil para alertas de reorden en el almacén
 * 
 * @param products - Array original (no se modifica)
 * @returns Nuevo array con productos en bajo stock
 * 
 * @example
 * const lowStock = filterLowStockProducts(allProducts)
 * // [LAPTOP-DELL-15] porque 8 <= 10
 */
export function filterLowStockProducts(products: Product[]): Product[] {
  return products.filter(
    (product) => product.stockQuantity <= product.minStockThreshold
  );
}

// ============================================================================
// ORDENAMIENTO DE PRODUCTOS
// ============================================================================

/**
 * Ordena productos por cantidad de stock (inmutable)
 * 
 * No modifica el array original. Crea una copia para ordenar.
 * 
 * @param products - Array original (no se modifica)
 * @param order - "asc" para ascendente, "desc" para descendente
 * @returns Nuevo array ordenado
 * 
 * @example
 * // Productos con mayor stock primero
 * sortProductsByStock(allProducts, "desc")
 * 
 * // Productos con menor stock primero
 * sortProductsByStock(allProducts, "asc")
 */
export function sortProductsByStock(
  products: Product[],
  order: "asc" | "desc"
): Product[] {
  // Crear copia para preservar inmutabilidad del original
  const sorted = [...products];
  
  if (order === "asc") {
    sorted.sort((a, b) => a.stockQuantity - b.stockQuantity);
  } else {
    sorted.sort((a, b) => b.stockQuantity - a.stockQuantity);
  }
  
  return sorted;
}

// ============================================================================
// ORDENAMIENTO DE TRANSPORTISTAS
// ============================================================================

/**
 * Ordena transportistas por confiabilidad (inmutable)
 * 
 * Confiabilidad se mide por: onTimeRate (tasa de entrega a tiempo)
 * No modifica el array original. Crea una copia para ordenar.
 * 
 * @param carriers - Array original de transportistas (no se modifica)
 * @param order - "asc" para ascendente, "desc" para descendente
 * @returns Nuevo array ordenado
 * 
 * @example
 * // Transportistas más confiables primero
 * sortCarriersByReliability(allCarriers, "desc")
 * // DHL (95%) > SEUR (92%) > UPS (88%)
 * 
 * // Transportistas menos confiables primero
 * sortCarriersByReliability(allCarriers, "asc")
 * // UPS (88%) > SEUR (92%) > DHL (95%)
 */
export function sortCarriersByReliability(
  carriers: Carrier[],
  order: "asc" | "desc"
): Carrier[] {
  // Crear copia para preservar inmutabilidad del original
  const sorted = [...carriers];
  
  if (order === "asc") {
    sorted.sort((a, b) => a.onTimeRate - b.onTimeRate);
  } else {
    sorted.sort((a, b) => b.onTimeRate - a.onTimeRate);
  }
  
  return sorted;
}
