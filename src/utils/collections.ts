/**
 * Utility functions para trabajar con colecciones
 */

export function groupBy<T, K extends string | number | symbol>(
  arr: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

export function filterBy<T>(
  arr: T[],
  predicate: (item: T) => boolean
): T[] {
  return arr.filter(predicate);
}

export function mapBy<T, U>(
  arr: T[],
  mapper: (item: T) => U
): U[] {
  return arr.map(mapper);
}

export type SortKey<T> = { key: (item: T) => any; dir?: 'asc' | 'desc' };

export function sortBy<T>(arr: T[], keys: SortKey<T>[]): T[] {
  const cloned = [...arr];
  cloned.sort((a, b) => {
    for (const k of keys) {
      const va = k.key(a);
      const vb = k.key(b);
      if (va === vb) continue;
      const cmp = va > vb ? 1 : -1;
      return k.dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
  return cloned;
}
