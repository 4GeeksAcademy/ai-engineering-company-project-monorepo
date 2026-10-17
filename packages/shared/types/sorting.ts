export type SortDirection = "asc" | "desc";

export interface MultiFieldSortCriterion<T> {
  field: keyof T;
  direction: SortDirection;
}

type Comparable = string | number;

function normalizeForComparison(value: unknown): Comparable {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  return String(value);
}

export function compareValues(
  left: string | number | Date,
  right: string | number | Date,
  direction: SortDirection,
): number {
  const normalizedLeft: Comparable = normalizeForComparison(left);
  const normalizedRight: Comparable = normalizeForComparison(right);

  if (normalizedLeft === normalizedRight) return 0;

  if (direction === "asc") {
    return normalizedLeft < normalizedRight ? -1 : 1;
  }
  return normalizedLeft > normalizedRight ? -1 : 1;
}

export function sortByField<T>(
  items: T[],
  field: keyof T,
  direction: SortDirection,
): T[] {
  return [...items].sort((left: T, right: T) => {
    const leftValue: string | number | Date = left[field] as unknown as string | number | Date;
    const rightValue: string | number | Date = right[field] as unknown as string | number | Date;
    return compareValues(leftValue, rightValue, direction);
  });
}

export function sortByMultipleFields<T>(
  items: T[],
  criteria: MultiFieldSortCriterion<T>[],
): T[] {
  return [...items].sort((left: T, right: T) => {
    for (const criterion of criteria) {
      const leftValue: string | number | Date =
        left[criterion.field] as unknown as string | number | Date;
      const rightValue: string | number | Date =
        right[criterion.field] as unknown as string | number | Date;
      const result: number = compareValues(leftValue, rightValue, criterion.direction);
      if (result !== 0) return result;
    }
    return 0;
  });
}
