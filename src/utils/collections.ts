import { DeliveryOrder, DeliveryStatus, ProductType, ServiceType } from '../types/models';

export type SortDirection = 'asc' | 'desc';

export interface SortCriterion<T> {
  field: keyof T;
  direction: SortDirection;
}

export interface DeliveryOrderFilter {
  status?: DeliveryStatus;
  service?: ServiceType;
  destinationCity?: string;
  minShippingCostUsd?: number;
  maxShippingCostUsd?: number;
}

export interface InventoryFilter {
  productType?: ProductType;
  minUnitsInStock?: number;
  maxUnitsInStock?: number;
}

type Comparable = string | number | boolean | Date;

function normalizeComparableValue(value: unknown): Comparable {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp);
    }
    return value.toLowerCase();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return String(value).toLowerCase();
}

function compareValues(left: unknown, right: unknown): number {
  const leftValue = normalizeComparableValue(left);
  const rightValue = normalizeComparableValue(right);

  if (leftValue instanceof Date && rightValue instanceof Date) {
    return leftValue.getTime() - rightValue.getTime();
  }

  if (leftValue < rightValue) {
    return -1;
  }

  if (leftValue > rightValue) {
    return 1;
  }

  return 0;
}

export function filterByPredicate<T>(items: T[], predicate: (item: T) => boolean): T[] {
  return items.filter(predicate);
}

export function filterByFields<T extends object>(items: T[], criteria: Partial<T>): T[] {
  const keys = Object.keys(criteria) as (keyof T)[];

  if (keys.length === 0) {
    return [...items];
  }

  return items.filter((item: T) =>
    keys.every((key: keyof T) => {
      const expected = criteria[key];
      if (typeof expected === 'undefined') {
        return true;
      }
      return item[key] === expected;
    })
  );
}

export function sortByField<T extends object>(
  items: T[],
  field: keyof T,
  direction: SortDirection = 'asc'
): T[] {
  const directionFactor = direction === 'asc' ? 1 : -1;

  return [...items].sort(
    (left: T, right: T) => directionFactor * compareValues(left[field as keyof T], right[field as keyof T])
  );
}

export function sortByMultipleFields<T extends object>(
  items: T[],
  criteria: SortCriterion<T>[]
): T[] {
  if (criteria.length === 0) {
    return [...items];
  }

  return [...items].sort((left: T, right: T) => {
    for (const criterion of criteria) {
      const directionFactor = criterion.direction === 'asc' ? 1 : -1;
      const result = compareValues(left[criterion.field], right[criterion.field]) * directionFactor;

      if (result !== 0) {
        return result;
      }
    }

    return 0;
  });
}

export function groupBy<T, K extends string>(items: T[], keySelector: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (groups: Record<K, T[]>, item: T) => {
      const key = keySelector(item);
      const currentGroup = groups[key] ?? [];
      groups[key] = [...currentGroup, item];
      return groups;
    },
    {} as Record<K, T[]>
  );
}

export function filterDeliveryOrders(items: DeliveryOrder[], filters: DeliveryOrderFilter): DeliveryOrder[] {
  return items.filter((item: DeliveryOrder) => {
    if (filters.status && item.status !== filters.status) {
      return false;
    }

    if (filters.service && item.service !== filters.service) {
      return false;
    }

    if (filters.destinationCity && item.destinationCity.toLowerCase() !== filters.destinationCity.toLowerCase()) {
      return false;
    }

    if (typeof filters.minShippingCostUsd === 'number' && item.shippingCostUsd < filters.minShippingCostUsd) {
      return false;
    }

    if (typeof filters.maxShippingCostUsd === 'number' && item.shippingCostUsd > filters.maxShippingCostUsd) {
      return false;
    }

    return true;
  });
}