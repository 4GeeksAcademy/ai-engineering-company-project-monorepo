import { DeliveryOrder, DeliveryStatus, InventoryRecord, ProductType } from '../types/models';
import { groupBy } from './collections';

export interface DeliveryOperationsReport {
  totalOrders: number;
  totalShippingCostUsd: number;
  averageShippingCostUsd: number;
  averageDistanceKm: number;
  maxShippingCostUsd: number | null;
  minShippingCostUsd: number | null;
  ordersByStatus: Record<DeliveryStatus, number>;
}

export interface InventorySummaryReport {
  totalSkus: number;
  totalUnitsInStock: number;
  totalInventoryValueUsd: number;
  averageUnitValueUsd: number;
  unitsByProductType: Record<ProductType, number>;
}

export function countByCategory<T, K extends string>(
  items: T[],
  categorySelector: (item: T) => K
): Record<K, number> {
  const grouped = groupBy(items, categorySelector);
  const counts = {} as Record<K, number>;

  for (const key of Object.keys(grouped) as K[]) {
    counts[key] = grouped[key].length;
  }

  return counts;
}

export function sumBy<T>(items: T[], valueSelector: (item: T) => number): number {
  return items.reduce((total: number, item: T) => total + valueSelector(item), 0);
}

export function averageBy<T>(items: T[], valueSelector: (item: T) => number): number {
  if (items.length === 0) {
    return 0;
  }

  return sumBy(items, valueSelector) / items.length;
}

export function maxBy<T>(items: T[], valueSelector: (item: T) => number): number | null {
  if (items.length === 0) {
    return null;
  }

  return items.reduce((maxValue: number, item: T) => Math.max(maxValue, valueSelector(item)), Number.NEGATIVE_INFINITY);
}

export function minBy<T>(items: T[], valueSelector: (item: T) => number): number | null {
  if (items.length === 0) {
    return null;
  }

  return items.reduce((minValue: number, item: T) => Math.min(minValue, valueSelector(item)), Number.POSITIVE_INFINITY);
}

function createDefaultDeliveryStatusCount(): Record<DeliveryStatus, number> {
  return {
    pending: 0,
    'in-transit': 0,
    delivered: 0,
    cancelled: 0
  };
}

function createDefaultUnitsByProductType(): Record<ProductType, number> {
  return {
    fashion: 0,
    electronics: 0,
    cosmetics: 0,
    food: 0,
    other: 0
  };
}

export function generateDeliveryOperationsReport(orders: DeliveryOrder[]): DeliveryOperationsReport {
  const groupedByStatus = countByCategory(orders, (order: DeliveryOrder) => order.status);
  const ordersByStatus = createDefaultDeliveryStatusCount();

  for (const status of Object.keys(groupedByStatus) as DeliveryStatus[]) {
    ordersByStatus[status] = groupedByStatus[status] ?? 0;
  }

  return {
    totalOrders: orders.length,
    totalShippingCostUsd: sumBy(orders, (order: DeliveryOrder) => order.shippingCostUsd),
    averageShippingCostUsd: averageBy(orders, (order: DeliveryOrder) => order.shippingCostUsd),
    averageDistanceKm: averageBy(orders, (order: DeliveryOrder) => order.distanceKm),
    maxShippingCostUsd: maxBy(orders, (order: DeliveryOrder) => order.shippingCostUsd),
    minShippingCostUsd: minBy(orders, (order: DeliveryOrder) => order.shippingCostUsd),
    ordersByStatus
  };
}

export function generateInventorySummaryReport(records: InventoryRecord[]): InventorySummaryReport {
  const unitsByProductType = createDefaultUnitsByProductType();

  for (const record of records) {
    unitsByProductType[record.productType] += record.unitsInStock;
  }

  return {
    totalSkus: records.length,
    totalUnitsInStock: sumBy(records, (record: InventoryRecord) => record.unitsInStock),
    totalInventoryValueUsd: sumBy(records, (record: InventoryRecord) => record.unitsInStock * record.unitValueUsd),
    averageUnitValueUsd: averageBy(records, (record: InventoryRecord) => record.unitValueUsd),
    unitsByProductType
  };
}