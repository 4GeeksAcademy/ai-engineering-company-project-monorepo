import { Department, KpiSnapshot } from "./entities";

export interface MinMaxResult {
  min: number | undefined;
  max: number | undefined;
}

export interface KpiOverview {
  countByDepartment: Record<Department, number>;
  totalRevenueUSD: number;
  avgSlaCompliancePct: number;
  openRolesMinMax: MinMaxResult;
}

export function countByCategory<T, K extends string>(
  items: T[],
  getCategory: (item: T) => K
): Record<K, number> {
  const counters = {} as Record<K, number>;

  for (const item of items) {
    const category = getCategory(item);
    counters[category] = (counters[category] ?? 0) + 1;
  }

  return counters;
}

export function sumBy<T>(items: T[], getValue: (item: T) => number): number {
  return items.reduce((sum, item) => sum + getValue(item), 0);
}

export function maxBy<T>(items: T[], getValue: (item: T) => number): number | undefined {
  if (items.length === 0) {
    return undefined;
  }

  return items.reduce((max, item) => Math.max(max, getValue(item)), getValue(items[0]));
}

export function minBy<T>(items: T[], getValue: (item: T) => number): number | undefined {
  if (items.length === 0) {
    return undefined;
  }

  return items.reduce((min, item) => Math.min(min, getValue(item)), getValue(items[0]));
}

export function averageBy<T>(items: T[], getValue: (item: T) => number): number {
  if (items.length === 0) {
    return 0;
  }

  return sumBy(items, getValue) / items.length;
}

export function minMaxBy<T>(items: T[], getValue: (item: T) => number): MinMaxResult {
  return {
    min: minBy(items, getValue),
    max: maxBy(items, getValue),
  };
}

export function buildKpiOverview(snapshots: KpiSnapshot[]): KpiOverview {
  const baseCountByDepartment: Record<Department, number> = {
    sales: 0,
    recruiting: 0,
    training: 0,
    support: 0,
    hr: 0,
    marketing: 0,
  };

  const dynamicCounts = countByCategory(snapshots, (snapshot) => snapshot.department);
  const countByDepartment = { ...baseCountByDepartment, ...dynamicCounts };

  return {
    countByDepartment,
    totalRevenueUSD: sumBy(snapshots, (snapshot) => snapshot.revenueUSD),
    avgSlaCompliancePct: Number(
      averageBy(snapshots, (snapshot) => snapshot.slaCompliancePct).toFixed(2)
    ),
    openRolesMinMax: minMaxBy(snapshots, (snapshot) => snapshot.openRoles),
  };
}