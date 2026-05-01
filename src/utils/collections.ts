import { Claim, Appointment, AppointmentStatus } from "../types/models";

export function filterClaims(
  claims: Claim[],
  filters: Partial<Pick<Claim, "locationId" | "status" | "payerName" | "serviceType">>
): Claim[] {
  return claims.filter(claim => {
    if (filters.locationId !== undefined && claim.locationId !== filters.locationId) return false;
    if (filters.status !== undefined && claim.status !== filters.status) return false;
    if (filters.payerName !== undefined && claim.payerName !== filters.payerName) return false;
    if (filters.serviceType !== undefined && claim.serviceType !== filters.serviceType) return false;
    return true;
  });
}

export function filterAppointmentsByStatus(
  appointments: Appointment[],
  status: AppointmentStatus[]
): Appointment[] {
  return appointments.filter(appointment => status.includes(appointment.status));
}

export function sortClaimsById(claims: Claim[], direction: "asc" | "desc"): Claim[] {
  return [...claims].sort((a, b) => {
    if (direction === "asc") return a.claimId.localeCompare(b.claimId);
    return b.claimId.localeCompare(a.claimId);
  });
}

export function sortAppointmentsByDate(
  appointments: Appointment[],
  direction: "asc" | "desc"
): Appointment[] {
  return [...appointments].sort((a, b) => {
    const dateA = new Date(a.scheduledDate).getTime();
    const dateB = new Date(b.scheduledDate).getTime();
    if (direction === "asc") return dateA - dateB;
    return dateB - dateA;
  });
}

export function groupClaimsBy(
  claims: Claim[],
  key: "locationId" | "payerName" | "status" | "serviceType"
): Record<string, Claim[]> {
  return claims.reduce((groups, claim) => {
    const groupKey = claim[key];
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(claim);
    return groups;
  }, {} as Record<string, Claim[]>);
}