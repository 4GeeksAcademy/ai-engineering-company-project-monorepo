export function filterItems<T>(
  items: readonly T[],
  predicate: (item: T, index: number) => boolean
): T[] {
  return items.filter(predicate);
}

export function sortItems<T>(
  items: readonly T[],
  compare: (left: T, right: T) => number
): T[] {
  return [...items].sort(compare);
}

export function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  keySelector: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  for (const item of items) {
    const key = keySelector(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return groups;
}
