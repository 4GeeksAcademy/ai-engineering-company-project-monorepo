import type { PatientEnquiry, ServiceType } from "../types/models.js";
import { groupBy } from "./collections.js";

export function countBy<T, K extends PropertyKey>(
  items: readonly T[],
  keySelector: (item: T) => K
): Map<K, number> {
  const counts = new Map<K, number>();

  for (const item of items) {
    const key = keySelector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export function sumBy<T>(
  items: readonly T[],
  valueSelector: (item: T) => number
): number {
  return items.reduce((total, item) => total + valueSelector(item), 0);
}

export function averageBy<T>(
  items: readonly T[],
  valueSelector: (item: T) => number
): number | undefined {
  if (items.length === 0) return undefined;
  return sumBy(items, valueSelector) / items.length;
}

export function minimumBy<T>(
  items: readonly T[],
  valueSelector: (item: T) => number
): T | undefined {
  return items.reduce<T | undefined>(
    (minimum, item) =>
      minimum === undefined || valueSelector(item) < valueSelector(minimum)
        ? item
        : minimum,
    undefined
  );
}

export function maximumBy<T>(
  items: readonly T[],
  valueSelector: (item: T) => number
): T | undefined {
  return items.reduce<T | undefined>(
    (maximum, item) =>
      maximum === undefined || valueSelector(item) > valueSelector(maximum)
        ? item
        : maximum,
    undefined
  );
}

export interface EnquiryReport {
  readonly totalEnquiries: number;
  readonly byClinic: Map<string, number>;
  readonly byService: Map<ServiceType | "", number>;
  readonly enquiriesByClinic: Map<string, PatientEnquiry[]>;
}

export function createEnquiryReport(
  enquiries: readonly PatientEnquiry[]
): EnquiryReport {
  return {
    totalEnquiries: enquiries.length,
    byClinic: countBy(enquiries, (enquiry) => enquiry.preferred_clinic),
    byService: countBy(enquiries, (enquiry) => enquiry.service_type),
    enquiriesByClinic: groupBy(enquiries, (enquiry) => enquiry.preferred_clinic)
  };
}
