import type {
  Appointment,
  AppointmentStatus,
  Claim,
  ClaimStatus,
  ServiceType
} from "../types/models.js";

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

export type ClaimFilters = Partial<Pick<Claim,
  "locationId" | "status" | "payerName" | "serviceType"
>>;

export function filterClaims(claims: readonly Claim[], filters: ClaimFilters): Claim[] {
  return claims.filter((claim) =>
    Object.entries(filters).every(([key, value]) =>
      value === undefined || claim[key as keyof Claim] === value
    )
  );
}

export function filterAppointmentsByStatus(
  appointments: readonly Appointment[],
  statuses: readonly AppointmentStatus[]
): Appointment[] {
  const acceptedStatuses = new Set(statuses);
  return appointments.filter((appointment) => acceptedStatuses.has(appointment.status));
}

export function sortClaimsById(
  claims: readonly Claim[],
  direction: "asc" | "desc" = "asc"
): Claim[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...claims].sort((left, right) => factor * left.claimId.localeCompare(right.claimId));
}

export function sortAppointmentsByDate(
  appointments: readonly Appointment[],
  direction: "asc" | "desc" = "asc"
): Appointment[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...appointments].sort(
    (left, right) => factor * left.scheduledDate.localeCompare(right.scheduledDate)
  );
}

export type ClaimGroupKey = "locationId" | "payerName" | "status" | "serviceType";

export function groupClaimsBy(
  claims: readonly Claim[],
  key: ClaimGroupKey
): Record<string, Claim[]> {
  const groups: Record<string, Claim[]> = Object.create(null) as Record<string, Claim[]>;
  for (const claim of claims) {
    const groupKey: ClaimStatus | ServiceType | string = claim[key];
    (groups[groupKey] ??= []).push(claim);
  }
  return groups;
}
