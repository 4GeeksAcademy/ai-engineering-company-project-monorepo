export function sumBy<T>(arr: T[], selector: (item: T) => number): number {
  return arr.reduce((sum, item) => sum + (selector(item) ?? 0), 0);
}

export function avgBy<T>(arr: T[], selector: (item: T) => number): number {
  if (arr.length === 0) return 0;
  return sumBy(arr, selector) / arr.length;
}

export function maxBy<T>(arr: T[], selector: (item: T) => number): T | null {
  if (arr.length === 0) return null;
  return arr.reduce((prev, current) =>
    selector(current) > selector(prev) ? current : prev
  );
}

export function minBy<T>(arr: T[], selector: (item: T) => number): T | null {
  if (arr.length === 0) return null;
  return arr.reduce((prev, current) =>
    selector(current) < selector(prev) ? current : prev
  );
}

export function countBy<T, K extends string | number>(arr: T[], keyFn: (item: T) => K): Record<K, number> {
  return arr.reduce((acc: Record<K, number>, cur) => {
    const k = keyFn(cur);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<K, number>);
}

export function reportCountsByCategory<T>(
  arr: T[],
  categoryFn: (item: T) => string
): Record<string, number> {
  return arr.reduce((acc, item) => {
    const key = categoryFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export function reportSummaryByCategory<T>(
  arr: T[],
  categoryFn: (item: T) => string,
  valueFn: (item: T) => number
): Record<string, { count: number; sum: number; avg: number; min: number; max: number }> {
  const temp: Record<string, { count: number; sum: number; min: number; max: number }> = {};
  for (const it of arr) {
    const k = categoryFn(it);
    const v = valueFn(it) ?? 0;
    if (!temp[k]) temp[k] = { count: 0, sum: 0, min: v, max: v };
    temp[k].count += 1;
    temp[k].sum += v;
    if (v < temp[k].min) temp[k].min = v;
    if (v > temp[k].max) temp[k].max = v;
  }
  const out: Record<string, { count: number; sum: number; avg: number; min: number; max: number }> = {};
  for (const k of Object.keys(temp)) {
    const t = temp[k];
    out[k] = { count: t.count, sum: t.sum, avg: t.count === 0 ? 0 : t.sum / t.count, min: t.min, max: t.max };
  }
  return out;
}
