import { sampleAppointments, sampleClaims, sampleClinicians, getReportingDate } from "./sample-data";
import { generateCMEReport, calculateDenialRate, noShowRateByLocation } from "./transformations";

export function getDashboardMetrics() {
  const noShowCount = sampleAppointments.filter((appointment) => appointment.status === "no_show").length;
  const noShowRate = sampleAppointments.length === 0 ? 0 : (noShowCount / sampleAppointments.length) * 100;
  const cmeAtRisk = generateCMEReport(sampleClinicians, getReportingDate())
    .filter(({ complianceStatus }) => complianceStatus === "at_risk" || complianceStatus === "overdue").length;
  const clinicRates = noShowRateByLocation(sampleAppointments);
  const clinicCount = Object.keys(clinicRates).length;
  return [
    { tone: "teal", area: "Sample set", tag: "Synthetic", value: String(clinicCount), label: "clinics represented in sample", detail: "Illustrative records only" },
    { tone: "coral", area: "Patient access", tag: "Calculated", value: `${noShowRate.toFixed(2)}%`, label: "sample no-show rate", detail: `${noShowCount} of ${sampleAppointments.length} sample appointments` },
    { tone: "amber", area: "Revenue cycle", tag: "Calculated", value: `${calculateDenialRate(sampleClaims).toFixed(2)}%`, label: "sample claims denial rate", detail: `Calculated from ${sampleClaims.length} sample claims` },
    { tone: "ink", area: "Workforce", tag: "Calculated", value: String(cmeAtRisk), label: "sample clinicians at CME risk", detail: `${sampleClinicians.length} records · ${Object.keys(clinicRates).length} clinic rates` },
  ];
}
