import type { Appointment, AppointmentStatus, Claim } from "./index";

export function filterClaims(
  claims: Claim[],
  filters: Partial<Pick<Claim, "locationId" | "status" | "payerName" | "serviceType">>,
): Claim[] {
  return claims.filter((claim: Claim): boolean =>
    Object.entries(filters).every(([key, value]: [string, unknown]): boolean => claim[key as keyof Claim] === value),
  );
}

export function filterAppointmentsByStatus(
  appointments: Appointment[],
  status: AppointmentStatus[],
): Appointment[] {
  return appointments.filter((appointment: Appointment): boolean => status.includes(appointment.status));
}

export function sortClaimsById(claims: Claim[], direction: "asc" | "desc"): Claim[] {
  return [...claims].sort((left: Claim, right: Claim): number =>
    compareStrings(left.claimId, right.claimId, direction),
  );
}

export function sortAppointmentsByDate(appointments: Appointment[], direction: "asc" | "desc"): Appointment[] {
  return [...appointments].sort((left: Appointment, right: Appointment): number =>
    compareStrings(left.scheduledDate, right.scheduledDate, direction),
  );
}

export function groupClaimsBy(
  claims: Claim[],
  key: "locationId" | "payerName" | "status" | "serviceType",
): Record<string, Claim[]> {
  return claims.reduce((groups: Record<string, Claim[]>, claim: Claim): Record<string, Claim[]> => {
    const groupKey: string = claim[key];
    groups[groupKey] ??= [];
    groups[groupKey].push(claim);
    return groups;
  }, {});
}

function compareStrings(left: string, right: string, direction: "asc" | "desc"): number {
  const comparison: number = left.localeCompare(right);
  return direction === "asc" ? comparison : -comparison;
}
