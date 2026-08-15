export type SortDirection = "asc" | "desc";

export function isEmpty<T>(items: T[]): boolean {
  return items.length === 0;
}

export function filterItems<T>(items: T[], predicate: (item: T) => boolean): T[] {
  if (isEmpty(items)) {
    return [];
  }

  return items.filter(predicate);
}

export function sortItems<T>(
  items: T[],
  compare: (a: T, b: T) => number,
  direction: SortDirection = "asc"
): T[] {
  if (isEmpty(items)) {
    return [];
  }

  const ordered = [...items].sort(compare);
  return direction === "asc" ? ordered : ordered.reverse();
}

export function linearSearchIndex<T>(
  items: T[],
  predicate: (item: T) => boolean
): number {
  if (isEmpty(items)) {
    return -1;
  }

  for (let index = 0; index < items.length; index += 1) {
    if (predicate(items[index])) {
      return index;
    }
  }

  return -1;
}

export function linearSearch<T>(
  items: T[],
  predicate: (item: T) => boolean
): T | undefined {
  const index = linearSearchIndex(items, predicate);
  return index === -1 ? undefined : items[index];
}

export function binarySearchIndex<T>(
  items: T[],
  target: T,
  compare: (a: T, b: T) => number
): number {
  if (isEmpty(items)) {
    return -1;
  }

  let left = 0;
  let right = items.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const result = compare(items[middle], target);

    if (result === 0) {
      return middle;
    }

    if (result < 0) {
      left = middle + 1;
      continue;
    }

    right = middle - 1;
  }

  return -1;
}

export function binarySearch<T>(
  items: T[],
  target: T,
  compare: (a: T, b: T) => number
): T | undefined {
  const index = binarySearchIndex(items, target, compare);
  return index === -1 ? undefined : items[index];
}

export function groupBy<T, K extends string>(
  items: T[],
  getKey: (item: T) => K
): Record<K, T[]> {
  const grouped = {} as Record<K, T[]>;

  for (const item of items) {
    const key = getKey(item);
    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(item);
  }

  return grouped;
}