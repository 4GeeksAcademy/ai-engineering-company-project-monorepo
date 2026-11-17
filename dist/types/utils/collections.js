export function filterItems(items, predicate) {
    return items.filter(predicate);
}
export function sortItems(items, compare) {
    return [...items].sort(compare);
}
export function groupBy(items, keySelector) {
    const groups = new Map();
    for (const item of items) {
        const key = keySelector(item);
        const group = groups.get(key);
        if (group) {
            group.push(item);
        }
        else {
            groups.set(key, [item]);
        }
    }
    return groups;
}
export function filterClaims(claims, filters) {
    return claims.filter((claim) => Object.entries(filters).every(([key, value]) => value === undefined || claim[key] === value));
}
export function filterAppointmentsByStatus(appointments, statuses) {
    const acceptedStatuses = new Set(statuses);
    return appointments.filter((appointment) => acceptedStatuses.has(appointment.status));
}
export function sortClaimsById(claims, direction = "asc") {
    const factor = direction === "asc" ? 1 : -1;
    return [...claims].sort((left, right) => factor * left.claimId.localeCompare(right.claimId));
}
export function sortAppointmentsByDate(appointments, direction = "asc") {
    const factor = direction === "asc" ? 1 : -1;
    return [...appointments].sort((left, right) => factor * left.scheduledDate.localeCompare(right.scheduledDate));
}
export function groupClaimsBy(claims, key) {
    const groups = Object.create(null);
    for (const claim of claims) {
        const groupKey = claim[key];
        (groups[groupKey] ??= []).push(claim);
    }
    return groups;
}
