import type { Appointment, AppointmentStatus, Claim } from "../types/models";

export function filterClaims(
  claims: Claim[],
  filters: Partial<Pick<Claim, "locationId" | "status" | "payerName" | "serviceType">>,
): Claim[] {
  return claims.filter((claim) => {
    return (Object.keys(filters) as Array<keyof typeof filters>).every((key) => {
      const filterValue = filters[key];
      return filterValue === undefined ? true : claim[key] === filterValue;
    });
  });
}

export function filterAppointmentsByStatus(
  appointments: Appointment[],
  status: AppointmentStatus[],
): Appointment[] {
  if (status.length === 0) {
    return [];
  }

  const allowedStatus = new Set<AppointmentStatus>(status);
  return appointments.filter((appointment) => allowedStatus.has(appointment.status));
}

export function sortClaimsById(claims: Claim[], direction: "asc" | "desc"): Claim[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...claims].sort((a, b) => a.claimId.localeCompare(b.claimId) * multiplier);
}

export function sortAppointmentsByDate(
  appointments: Appointment[],
  direction: "asc" | "desc",
): Appointment[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...appointments].sort(
    (a, b) => (new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()) * multiplier,
  );
}

export function groupClaimsBy(
  claims: Claim[],
  key: "locationId" | "payerName" | "status" | "serviceType",
): Record<string, Claim[]> {
  return claims.reduce<Record<string, Claim[]>>((acc, claim) => {
    const groupKey = claim[key];
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(claim);
    return acc;
  }, {});
}
