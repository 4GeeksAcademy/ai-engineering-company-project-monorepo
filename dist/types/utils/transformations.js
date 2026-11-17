import { groupBy } from "./collections.js";
export function countBy(items, keySelector) {
    const counts = new Map();
    for (const item of items) {
        const key = keySelector(item);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}
export function sumBy(items, valueSelector) {
    return items.reduce((total, item) => total + valueSelector(item), 0);
}
export function averageBy(items, valueSelector) {
    if (items.length === 0)
        return undefined;
    return sumBy(items, valueSelector) / items.length;
}
export function minimumBy(items, valueSelector) {
    return items.reduce((minimum, item) => minimum === undefined || valueSelector(item) < valueSelector(minimum)
        ? item
        : minimum, undefined);
}
export function maximumBy(items, valueSelector) {
    return items.reduce((maximum, item) => maximum === undefined || valueSelector(item) > valueSelector(maximum)
        ? item
        : maximum, undefined);
}
function rounded(value, decimalPlaces) {
    const factor = 10 ** decimalPlaces;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}
function rate(numerator, denominator) {
    return denominator === 0 ? 0 : rounded((numerator / denominator) * 100, 2);
}
function parseCalendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new RangeError(`Invalid calendar date: ${value}`);
    }
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day) {
        throw new RangeError(`Invalid calendar date: ${value}`);
    }
    return parsed;
}
function dateDifferenceInDays(from, to) {
    return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
function cycleEndDate(startDate) {
    const end = new Date(startDate);
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    end.setUTCDate(end.getUTCDate() - 1);
    return end;
}
export function calculateDenialRate(claims) {
    if (claims.length === 0)
        throw new RangeError("Cannot calculate denial rate for an empty claims array");
    return rate(claims.filter((claim) => claim.status === "denied").length, claims.length);
}
export function denialRateByPayer(claims) {
    const totals = new Map();
    for (const claim of claims) {
        const aggregate = totals.get(claim.payerName) ?? { total: 0, denied: 0 };
        aggregate.total += 1;
        if (claim.status === "denied")
            aggregate.denied += 1;
        totals.set(claim.payerName, aggregate);
    }
    return Object.fromEntries([...totals].map(([payer, counts]) => [payer, rate(counts.denied, counts.total)]));
}
export function denialRateByLocation(claims) {
    const totals = new Map();
    for (const claim of claims) {
        const aggregate = totals.get(claim.locationId) ?? { total: 0, denied: 0 };
        aggregate.total += 1;
        if (claim.status === "denied")
            aggregate.denied += 1;
        totals.set(claim.locationId, aggregate);
    }
    return Object.fromEntries([...totals].map(([locationId, counts]) => [locationId, rate(counts.denied, counts.total)]));
}
export function flagHighDenialPayers(claims, threshold = 8) {
    return Object.entries(denialRateByPayer(claims))
        .filter(([, denialRate]) => denialRate > threshold)
        .map(([payerName]) => payerName);
}
export function calculateNoShowCost(appointments, location, weekEndingDate) {
    const end = parseCalendarDate(weekEndingDate);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    const total = appointments
        .filter((appointment) => {
        if (appointment.status !== "no_show" || appointment.locationId !== location.locationId)
            return false;
        const date = parseCalendarDate(appointment.scheduledDate);
        return date >= start && date <= end;
    })
        .reduce((sum, appointment) => sum + location.averageConsultationFee[appointment.serviceType], 0);
    return rounded(total, 2);
}
export function noShowRateByLocation(appointments) {
    const totals = new Map();
    for (const appointment of appointments) {
        const aggregate = totals.get(appointment.locationId) ?? { total: 0, noShows: 0 };
        aggregate.total += 1;
        if (appointment.status === "no_show")
            aggregate.noShows += 1;
        totals.set(appointment.locationId, aggregate);
    }
    return Object.fromEntries([...totals].map(([locationId, counts]) => [locationId, rate(counts.noShows, counts.total)]));
}
export function flagHighNoShowLocations(appointments, threshold = 20) {
    return Object.entries(noShowRateByLocation(appointments))
        .filter(([, noShowRate]) => noShowRate > threshold)
        .map(([locationId]) => locationId);
}
export function generateCMEReport(clinicians, asOfDate) {
    const asOf = parseCalendarDate(asOfDate);
    return clinicians.map((clinician) => {
        const cycleStart = parseCalendarDate(clinician.cmeYearStartDate);
        const cycleEnd = cycleEndDate(cycleStart);
        const licenceExpiry = parseCalendarDate(clinician.licenceExpiryDate);
        const cycleDuration = dateDifferenceInDays(cycleStart, cycleEnd);
        const elapsedDays = Math.max(0, Math.min(cycleDuration, dateDifferenceInDays(cycleStart, asOf)));
        const percentComplete = clinician.cmeHoursRequired === 0
            ? 100
            : rounded((clinician.cmeHoursLogged / clinician.cmeHoursRequired) * 100, 2);
        const pacePercent = cycleDuration === 0 ? 100 : (elapsedDays / cycleDuration) * 100;
        let complianceStatus;
        if (clinician.cmeHoursLogged >= clinician.cmeHoursRequired)
            complianceStatus = "complete";
        else if (asOf > cycleEnd)
            complianceStatus = "overdue";
        else if (percentComplete < pacePercent - 15)
            complianceStatus = "at_risk";
        else
            complianceStatus = "on_track";
        return {
            clinicianId: clinician.clinicianId,
            fullName: `${clinician.firstName} ${clinician.lastName}`,
            role: clinician.role,
            locationId: clinician.locationId,
            hoursRequired: clinician.cmeHoursRequired,
            hoursLogged: clinician.cmeHoursLogged,
            hoursRemaining: Math.max(0, clinician.cmeHoursRequired - clinician.cmeHoursLogged),
            percentComplete,
            daysRemainingInCycle: dateDifferenceInDays(asOf, cycleEnd),
            complianceStatus,
            licenceExpiryDate: clinician.licenceExpiryDate,
            licenceDaysRemaining: dateDifferenceInDays(asOf, licenceExpiry)
        };
    });
}
export function getCliniciansAtRisk(clinicians, asOfDate) {
    const atRiskIds = new Set(generateCMEReport(clinicians, asOfDate)
        .filter((report) => report.complianceStatus === "at_risk" || report.complianceStatus === "overdue")
        .map((report) => report.clinicianId));
    return clinicians.filter((clinician) => atRiskIds.has(clinician.clinicianId));
}
export function getCliniciansWithExpiringLicences(clinicians, asOfDate, daysThreshold = 90) {
    if (daysThreshold < 0)
        throw new RangeError("daysThreshold must be non-negative");
    const asOf = parseCalendarDate(asOfDate);
    return clinicians.filter((clinician) => {
        const daysRemaining = dateDifferenceInDays(asOf, parseCalendarDate(clinician.licenceExpiryDate));
        return daysRemaining >= 0 && daysRemaining <= daysThreshold;
    });
}
export function createEnquiryReport(enquiries) {
    return {
        totalEnquiries: enquiries.length,
        byClinic: countBy(enquiries, (enquiry) => enquiry.preferred_clinic),
        byService: countBy(enquiries, (enquiry) => enquiry.service_type),
        enquiriesByClinic: groupBy(enquiries, (enquiry) => enquiry.preferred_clinic)
    };
}
