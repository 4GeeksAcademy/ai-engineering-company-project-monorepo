// Funciones utilitarias para manejo de colecciones

import { Product, InventoryItem, Shipment, ReturnRequest, Brand, ShipmentStatus, ReturnStatus, Country, ContractStatus } from '../types/models';

export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(items: T[], keyFn: (item: T) => number | string, ascending: boolean = true): T[] {
  return [...items].sort((a, b) => {
    const valA = keyFn(a);
    const valB = keyFn(b);
    const comparison = valA < valB ? -1 : valA > valB ? 1 : 0;
    return ascending ? comparison : -comparison;
  });
}

export function uniqueBy<T>(items: T[], keyFn: (item: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================
// FUNCIONES DE FILTRADO GENÉRICAS
// ============================================

/**
 * Filtra elementos por un rango numérico en un campo específico
 * @param items Array a filtrar
 * @param fieldName Campo numérico a evaluar
 * @param min Valor mínimo (inclusive)
 * @param max Valor máximo (inclusive)
 * @returns Array filtrado (copia sin mutación)
 * @example
 * const affordable = filterByNumericRange(products, 'unitPrice', 0, 100);
 */
export function filterByNumericRange<T>(
  items: T[],
  fieldName: keyof T,
  min: number,
  max: number
): T[] {
  return items.filter(item => {
    const value = item[fieldName];
    return typeof value === 'number' && value >= min && value <= max;
  });
}

/**
 * Filtra elementos que cumplen todos los predicados (AND lógico)
 * @param items Array a filtrar
 * @param predicates Array de funciones predicado
 * @returns Array filtrado (copia sin mutación)
 * @example
 * const filtered = filterByMultipleCriteria(shipments, [
 *   (s) => s.status === 'in_transit',
 *   (s) => s.weightKg > 10
 * ]);
 */
export function filterByMultipleCriteria<T>(
  items: T[],
  predicates: Array<(item: T) => boolean>
): T[] {
  return items.filter(item => predicates.every(predicate => predicate(item)));
}

// ============================================
// FUNCIONES DE FILTRADO ESPECÍFICAS
// ============================================

/**
 * Filtra productos dentro de un rango de precio
 * @param products Array de productos
 * @param minPrice Precio mínimo (inclusive)
 * @param maxPrice Precio máximo (inclusive)
 * @returns Array de productos filtrados
 * @example
 * const affordable = filterProductsByPriceRange(products, 10, 100);
 */
export function filterProductsByPriceRange(
  products: Product[],
  minPrice: number,
  maxPrice: number
): Product[] {
  return filterByNumericRange(products, 'unitPrice', minPrice, maxPrice);
}

/**
 * Filtra items de inventario con stock por debajo del umbral
 * @param items Array de items de inventario
 * @param threshold Cantidad mínima
 * @returns Items con quantityOnHand < threshold
 * @example
 * const lowStock = filterLowStockItems(inventory, 10);
 */
export function filterLowStockItems(
  items: InventoryItem[],
  threshold: number
): InventoryItem[] {
  return items.filter(item => item.quantityOnHand < threshold);
}

/**
 * Filtra items de inventario bajo stock en un almacén específico
 * @param items Array de items de inventario
 * @param warehouseId ID del almacén
 * @param threshold Cantidad mínima
 * @returns Items del almacén con stock bajo
 * @example
 * const laLowStock = filterLowStockByWarehouse(inventory, 'wh-la', 5);
 */
export function filterLowStockByWarehouse(
  items: InventoryItem[],
  warehouseId: string,
  threshold: number
): InventoryItem[] {
  return filterByMultipleCriteria(items, [
    (item) => item.warehouseId === warehouseId,
    (item) => item.quantityOnHand < threshold
  ]);
}

/**
 * Filtra envíos por estado específico
 * @param shipments Array de envíos
 * @param status Estado de envío a filtrar
 * @returns Envíos con el estado especificado
 * @example
 * const inTransit = filterShipmentsByStatus(shipments, 'in_transit');
 */
export function filterShipmentsByStatus(
  shipments: Shipment[],
  status: ShipmentStatus
): Shipment[] {
  return shipments.filter(shipment => shipment.status === status);
}

/**
 * Filtra envíos en tránsito que podrían estar retrasados
 * @param shipments Array de envíos
 * @param status Estado a filtrar (default: 'in_transit')
 * @returns Envíos en tránsito sin fecha de entrega confirmada
 * @example
 * const delayed = filterDelayedShipments(shipments);
 */
export function filterDelayedShipments(
  shipments: Shipment[],
  status: ShipmentStatus = 'in_transit'
): Shipment[] {
  return filterByMultipleCriteria(shipments, [
    (s) => s.status === status,
    (s) => !s.deliveredAt && s.isOnTime === false
  ]);
}

/**
 * Filtra devoluciones por estado específico
 * @param returns Array de solicitudes de devolución
 * @param status Estado a filtrar
 * @returns Devoluciones con el estado especificado
 * @example
 * const approved = filterReturnsByStatus(returns, 'approved');
 */
export function filterReturnsByStatus(
  returns: ReturnRequest[],
  status: ReturnStatus
): ReturnRequest[] {
  return returns.filter(ret => ret.status === status);
}

/**
 * Filtra devoluciones recibidas que aún no han sido inspeccionadas
 * @param returns Array de solicitudes de devolución
 * @returns Devoluciones en estado 'received' sin condición asignada
 * @example
 * const pending = filterPendingReturnInspections(returns);
 */
export function filterPendingReturnInspections(
  returns: ReturnRequest[]
): ReturnRequest[] {
  return filterByMultipleCriteria(returns, [
    (r) => r.status === 'received',
    (r) => !r.condition
  ]);
}

/**
 * Filtra marcas por país
 * @param brands Array de marcas
 * @param country País a filtrar ('US' | 'ES')
 * @returns Marcas del país especificado
 * @example
 * const usaBrands = filterBrandsByCountry(brands, 'US');
 */
export function filterBrandsByCountry(
  brands: Brand[],
  country: Country
): Brand[] {
  return brands.filter(brand => brand.country === country);
}

/**
 * Filtra marcas por estado de contrato
 * @param brands Array de marcas
 * @param status Estado de contrato a filtrar
 * @returns Marcas con el estado de contrato especificado
 * @example
 * const expiring = filterBrandsByContractStatus(brands, 'expiring');
 */
export function filterBrandsByContractStatus(
  brands: Brand[],
  status: ContractStatus
): Brand[] {
  return brands.filter(brand => brand.contractStatus === status);
}

/**
 * Filtra marcas con contrato próximo a vencer y riesgo elevado
 * @param brands Array de marcas
 * @param daysUntilExpiry Días hasta vencimiento
 * @param minRiskScore Puntuación de riesgo mínima (0-100)
 * @returns Marcas en riesgo de no renovación
 * @example
 * const atRisk = filterBrandsAtRenewalRisk(brands, 30, 60);
 */
export function filterBrandsAtRenewalRisk(
  brands: Brand[],
  daysUntilExpiry: number,
  minRiskScore: number
): Brand[] {
  const now = new Date();
  const expiryDate = new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);

  return filterByMultipleCriteria(brands, [
    (brand) => new Date(brand.contractEndDate) <= expiryDate,
    (brand) => (brand.riskScore ?? 0) >= minRiskScore
  ]);
}

// ============================================
// FUNCIONES DE ORDENAMIENTO ESPECÍFICAS
// ============================================

/**
 * Ordena productos por precio
 * @param products Array de productos
 * @param ascending Orden ascendente (default: true)
 * @returns Array ordenado (copia sin mutación)
 * @example
 * const cheapest = sortProductsByPrice(products, true);
 */
export function sortProductsByPrice(
  products: Product[],
  ascending: boolean = true
): Product[] {
  return sortBy(products, (p) => p.unitPrice, ascending);
}

/**
 * Ordena inventario por cantidad disponible
 * @param items Array de items de inventario
 * @param ascending Orden ascendente (default: true, menores primero)
 * @returns Array ordenado (copia sin mutación)
 * @example
 * const critical = sortInventoryByQuantity(inventory, true); // stock bajo primero
 */
export function sortInventoryByQuantity(
  items: InventoryItem[],
  ascending: boolean = true
): InventoryItem[] {
  return sortBy(items, (item) => item.quantityOnHand, ascending);
}

/**
 * Ordena envíos por fecha de envío/entrega
 * @param shipments Array de envíos
 * @param ascending Orden ascendente (default: true, más antiguos primero)
 * @returns Array ordenado (copia sin mutación)
 * @example
 * const recent = sortShipmentsByDate(shipments, false); // más recientes primero
 */
export function sortShipmentsByDate(
  shipments: Shipment[],
  ascending: boolean = true
): Shipment[] {
  return sortBy(
    shipments,
    (s) => s.deliveredAt ?? s.shippedAt ?? '0000-01-01',
    ascending
  );
}

/**
 * Ordena marcas por puntuación de riesgo
 * @param brands Array de marcas
 * @param ascending Orden ascendente (default: false, riesgo alto primero)
 * @returns Array ordenado (copia sin mutación)
 * @example
 * const riskiest = sortBrandsByRiskScore(brands, false); // riesgo alto primero
 */
export function sortBrandsByRiskScore(
  brands: Brand[],
  ascending: boolean = false
): Brand[] {
  return sortBy(brands, (b) => b.riskScore ?? 0, ascending);
}

/**
 * Ordena marcas por fecha de vencimiento de contrato
 * @param brands Array de marcas
 * @param ascending Orden ascendente (default: true, próximas a vencer primero)
 * @returns Array ordenado (copia sin mutación)
 * @example
 * const expiring = sortBrandsByContractEndDate(brands, true); // vencen pronto primero
 */
export function sortBrandsByContractEndDate(
  brands: Brand[],
  ascending: boolean = true
): Brand[] {
  return sortBy(brands, (b) => b.contractEndDate, ascending);
}