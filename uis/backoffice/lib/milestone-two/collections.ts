import type { Appointment, AppointmentStatus, Claim } from "./types";

export function filterClaims(
  claims: Claim[],
  filters: Partial<Pick<Claim, "locationId" | "status" | "payerName" | "serviceType">>,
): Claim[] {
  return claims.filter((claim) =>
    Object.entries(filters).every(([key, value]) => claim[key as keyof Claim] === value),
  );
}

export function filterAppointmentsByStatus(
  appointments: Appointment[],
  statuses: AppointmentStatus[],
): Appointment[] {
  const accepted = new Set(statuses);
  return appointments.filter((appointment) => accepted.has(appointment.status));
}

export function sortClaimsById(claims: Claim[], direction: "asc" | "desc"): Claim[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...claims].sort((left, right) => multiplier * left.claimId.localeCompare(right.claimId));
}

export function sortAppointmentsByDate(appointments: Appointment[], direction: "asc" | "desc"): Appointment[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...appointments].sort(
    (left, right) => multiplier * left.scheduledDate.localeCompare(right.scheduledDate),
  );
}

export function groupClaimsBy(
  claims: Claim[],
  key: "locationId" | "payerName" | "status" | "serviceType",
): Record<string, Claim[]> {
  return claims.reduce<Record<string, Claim[]>>((groups, claim) => {
    (groups[claim[key]] ??= []).push(claim);
    return groups;
  }, {});
}
