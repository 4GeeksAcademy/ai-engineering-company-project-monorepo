import type {
  AggregationReport,
  FilterCriteria,
  SortCriterion,
} from "./index";

export function filterItems<T>(items: readonly T[], criteria: FilterCriteria<T>): T[] {
  return items.filter((item: T): boolean => {
    const matchesFields: boolean = Object.entries(criteria.matches ?? {}).every(
      ([field, expectedValue]: [string, unknown]): boolean => item[field as keyof T] === expectedValue,
    );
    const matchesPredicate: boolean = criteria.predicate === undefined || criteria.predicate(item);
    return matchesFields && matchesPredicate;
  });
}

export function sortItems<T>(items: readonly T[], criteria: readonly SortCriterion<T>[]): T[] {
  return [...items].sort((left: T, right: T): number => {
    for (const criterion of criteria) {
      const leftValue: unknown = left[criterion.field];
      const rightValue: unknown = right[criterion.field];
      const comparison: number = compareValues(leftValue, rightValue);
      if (comparison !== 0) {
        return criterion.direction === "asc" ? comparison : -comparison;
      }
    }
    return 0;
  });
}

export function linearSearch<T>(items: readonly T[], predicate: (item: T) => boolean): T | undefined {
  for (const item of items) {
    if (predicate(item)) {
      return item;
    }
  }
  return undefined;
}

export function binarySearch<T>(
  sortedItems: readonly T[],
  target: T,
  compare: (left: T, right: T) => number,
): T | undefined {
  let lowerBound: number = 0;
  let upperBound: number = sortedItems.length - 1;

  while (lowerBound <= upperBound) {
    const middleIndex: number = Math.floor((lowerBound + upperBound) / 2);
    const comparison: number = compare(sortedItems[middleIndex], target);
    if (comparison === 0) {
      return sortedItems[middleIndex];
    }
    if (comparison < 0) {
      lowerBound = middleIndex + 1;
    } else {
      upperBound = middleIndex - 1;
    }
  }
  return undefined;
}

export function countBy<T, K extends PropertyKey>(items: readonly T[], selector: (item: T) => K): Map<K, number> {
  const counts: Map<K, number> = new Map<K, number>();
  for (const item of items) {
    const key: K = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function sumBy<T>(items: readonly T[], selector: (item: T) => number): number {
  return items.reduce((total: number, item: T): number => total + selector(item), 0);
}

export function averageBy<T>(items: readonly T[], selector: (item: T) => number): number {
  return items.length === 0 ? 0 : sumBy(items, selector) / items.length;
}

export function minimumBy<T>(items: readonly T[], selector: (item: T) => number): number | undefined {
  return items.length === 0 ? undefined : Math.min(...items.map(selector));
}

export function maximumBy<T>(items: readonly T[], selector: (item: T) => number): number | undefined {
  return items.length === 0 ? undefined : Math.max(...items.map(selector));
}

export function summarizeNumbers<T>(items: readonly T[], selector: (item: T) => number): AggregationReport {
  return {
    count: items.length,
    total: sumBy(items, selector),
    average: averageBy(items, selector),
    minimum: minimumBy(items, selector),
    maximum: maximumBy(items, selector),
  };
}

function compareValues(left: unknown, right: unknown): number {
  if (left === right) {
    return 0;
  }
  if (left === undefined || left === null) {
    return -1;
  }
  if (right === undefined || right === null) {
    return 1;
  }
  return left < right ? -1 : 1;
}